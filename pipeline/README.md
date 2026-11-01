# Data pipeline

Two scripts turn the collections' species lists into the files the website loads. The contract
for those files is [`docs/data-format.md`](../docs/data-format.md). Curation, the snapshot,
content and photos are shared by every collection and keyed by species or node id; only the
species lists and videos are per collection.

| Script | Network | Reads | Writes |
|--------|---------|-------|--------|
| `refresh.py` | yes | `collections/*/species.csv` and `videos.csv`, the datasets in `sources.py` | `pipeline/snapshot/*.json` (committed), `.cache/` (ignored) |
| `build.py` | no | `collections/*/*.csv`, `curation/*.csv`, `pipeline/snapshot/`, `content/**/*.json` | `data/collections.js`; per collection `data/<id>/bestiary.js`, `content.js`, `media.js` (through `media.py`); `CREDITS.md`, `reports/build-report.md` |

Use the project's virtual environment (Python 3 standard library plus openpyxl):

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # once
.venv/bin/python pipeline/refresh.py      # about an hour cold (GBIF at 1 request/s), ~10 minutes with a warm cache (the link check is never cached)
.venv/bin/python pipeline/build.py        # seconds; same inputs give byte-identical output
.venv/bin/python -m unittest discover -s pipeline/tests   # builds into a temp dir; fails if data/ is stale
```

## When to run what

- **A species list changed** (new species, new collection, new videos): run `refresh.py`, then
  `media.py select --only <new ids>` and `fetch`, then `build.py`, then the tests. `build.py`
  refuses to run if a species is missing from the snapshot. The CI workflow does all of this on a
  pull request.
- **You edited `curation/*.csv` or `content/`**: `build.py` is enough.
- **Yearly**: `refresh.py --fresh` ignores the HTTP cache so every name, IUCN category and video
  link is checked again. Bulk datasets stay in `.cache/datasets/`; delete a file there to fetch it again.

## refresh.py

- Resolves each binomial against the GBIF backbone (key, status, accepted name, synonyms,
  family, authority, IUCN category, Spanish vernaculars), Wikidata (item, EN/ES labels,
  Wikipedia links, range, habitat and food items, IUCN fallback) and iNaturalist (taxon id).
- Downloads the bulk trait datasets listed in `sources.py` into `.cache/datasets/` when missing,
  records their sha256 in `snapshot/meta.json`, and keeps only the rows of the listed species and
  the columns the build uses (`snapshot/traits.json`). Rows are matched on the exact binomial
  first, then on GBIF names; every match records how it was found (`via`).
- Reads the MITECO LESRPE/CEEA table into `snapshot/miteco.json`.
- Checks every video link of every collection (`snapshot/links.json`, keyed by URL): YouTube oEmbed plus the watch page's
  `playabilityStatus` and `playableInEmbed`; Vimeo oEmbed; plain HTTP for other sites. A
  `fishbase.org` 403 is bot protection, not a broken link. A link with trailing junk is
  repaired and re-checked. `--skip-links` keeps the previous check.
- Politeness: User-Agent with a contact, at most one request per second per host, retries with
  backoff on 429, 5xx and network errors. API responses are cached for 7 days in `.cache/http/`.
- `--collections DIR --snapshot DIR` point it at another set of collections (the tests' arthropod
  fixture has its own snapshot in `tests/fixtures/snapshot/`).

## build.py

- Builds every collection under `collections/`, in their `orden`. Each collection's tree keeps
  only the `clades.csv` rows above its own classes. Its root is the top clade above them; if they
  sit under several top clades, their deepest shared `deep:` row becomes the root; if none of its
  classes is in `clades.csv`, the collection gets a root of its own and a warning.

- **Fails loudly** (exit 1, with file, row and column) on CSV errors: a file that is not UTF-8,
  a row with more or fewer fields than the header (an unquoted comma), a duplicated or missing
  column, an empty required cell, a binomial that is not "Genus species", a duplicate binomial, a
  link that is not `http(s)://` (in any CSV, content source or photo record), an order listed
  under two classes, a species classified differently in two collections, a collection folder
  name other than `a-z0-9-`, a video without its channel, a malformed `clades.csv` (unknown
  prefix, missing parent, an order outside its class in the list, a cycle), an invalid confidence
  or status in `corrections.csv`, or a list of 20 or more species of which fewer than half have
  photos in `curation/media_manifest.json` (a misread list, or new species whose photos weren't
  selected yet, would otherwise publish a collection without photos). Nothing in `data/` is written unless the
  whole build succeeds.
- Every CSV goes through `common.read_csv` (`,` or `;`, UTF-8 with or without BOM), including
  `media.py`'s reads of the species lists and `media_overrides.csv`. The third-party datasets that
  `refresh.py` downloads keep their own reader (`table_rows`): their delimiters, encodings and line
  ends are fixed per dataset in `sources.py`.
- **Does not fail** on things a collection maintainer cannot fix. A new class or order without a row in
  `clades.csv` is attached to its class (or to the root) and listed as a warning in
  `reports/build-report.md`. A class dropped from the list takes the `clades.csv` rows that hang
  from it out of the tree, also with a warning.
- A video is shown as checked (`ok`/`broken`) only when `snapshot/links.json` checked that same
  URL; a new or changed link is `link_only` until the next `refresh.py`.
- **Facts** (`facts.py`, wording in `vocab.py`): one per field, from the first source in the
  stack of `docs/data-sources.md` that has a value. Values matched through a
  `parent_of_split` name are dropped and listed in the build report. Wikidata mass (P2067) is
  never used. Dimorphism is stated only from a dataset's male/female ratio (mass: yes at ≥ 1.20,
  no at ≤ 1.10; length: yes at ≥ 1.07, no at ≤ 1.03; silent in between). Sex determination
  falls back to the class rule (mammals XY, monotremes multiple XY, birds ZW) with
  `match: "rule"`.
- A categorical value with no translation in `vocab.py` is skipped and listed under
  "Untranslated dataset values" in the build report: add it to the right table.

## Curation files

| File | What it decides |
|------|-----------------|
| `curation/clades.csv` | The tree above and between the lists' ranks, shared by every collection. `deep:` rows are the path from Life towards the root clades; `clade:` rows are the backbone (vertebrates, and the main arthropod groups); `class:`, `order:` and `infraorder:` rows attach the lists' groups and give them ES/EN names; a `grade:` row marks a class of the lists that is not a clade (Reptilia), whose orders hang from clades and carry `grade`. Every row needs `name_es`, `name_en` and a `source_url`. Placements were checked against the Open Tree of Life induced subtree (opentree16.1); where unsure, attach an order directly to its class |
| `curation/corrections.csv` | Notes where a list's value differs from a current authority, shown on cards. `certain` and `suggested` rows are `accepted`; `contested` rows stay `pending`. `field` is the `species.csv` column concerned (`nombre_cientifico`, `orden`, `nombre_vulgar`) |
| `curation/synonyms.csv` | Overrides for the synonym rule. By default a name reached through a trinomial or with a different epithet is `parent_of_split` (dropped); a genus change with the same epithet is the same taxon. List a pair here as `same_taxon` when it is only a competing name (e.g. *Otaria flavescens* / *O. byronia*) |
| `curation/media_overrides.csv` | Owned by `media.py` |

## Sources and licences

`sources.py` is the registry: title, link, licence, and the download URL of every bulk dataset.
`CREDITS.md` is generated from it. Since 2026-11-01 non-commercial sources are allowed: **FishBase**
(CC BY-NC 4.0; `fishbase.py`, Parquet tables of the rfishbase snapshot, first source for fishes'
distribution, habitat, diet, length, weight and migration, fallback for lifespan) and **Animal
Diversity Web** (CC BY-NC-SA; `adw.py`, only its sexual-dimorphism keywords, a fallback after the
size-ratio rule; one request every 8 s, cached in `.cache/http-adw/`). Their facts cite the species'
own page (`fishbase:<SpecCode>`, `adw:<Genus_species>`), registered per species by `build.py`. So
the compiled data is CC BY-NC-SA 4.0; texts in `content/` stay CC BY-SA 4.0 (drafted from
Wikipedia). SeaLifeBase is left out (thin, values on the wrong taxa); the Enciclopedia Virtual de
los Vertebrados Españoles (CC BY-NC-ND) is a reference for writers only. GoaT is excluded because
its data licence could not be verified. AnAge (HAGR) is licensed CC BY 3.0 Unported according to
<https://genomics.senescence.info/legal.html> (checked 2026-11-01), which allows redistribution
with attribution, so its values stay in the stack and are credited in `CREDITS.md`.
