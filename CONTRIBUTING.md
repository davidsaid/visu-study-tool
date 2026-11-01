# Contributing

Thank you for helping. This guide is for anyone sending a pull request, and especially for people
who work with an AI coding agent: give your agent this file, and the section
[Instructions for your AI agent](#instructions-for-your-ai-agent) at the end, before it starts.

*Resumen en español al final.*

## The short version

- One topic per pull request, with a description that says what changed, why, and how you
  checked it.
- Every fact, photo and text names its source. A value you can't credit doesn't go in.
- Change only the **inputs** (species lists, texts, code, tests, docs). Don't commit generated
  files; our checks regenerate them before merging.
- New behaviour comes with a test, and all tests pass.
- If you used an AI agent, say so, and say what a person checked.

## What the project is made of

The site is plain HTML, CSS and JavaScript with no build step and no server. It works from a
downloaded folder and from GitHub Pages. Each student's progress stays in their own browser.

| Path | What it is | Who edits it |
|------|------------|--------------|
| `collections/<id>/` | One folder per bestiary: `collection.csv`, `species.csv`, optional `videos.csv` | You |
| `content/species/`, `content/groups/` | Written texts per species and group: field marks, look-alikes, etymology, summaries (JSON) | You |
| `curation/*.csv` | The tree's backbone (`clades.csv`), notes on names (`corrections.csv`), photo choices (`media_overrides.csv`) | You |
| `app/` | The website | You |
| `pipeline/` | Python scripts that fetch data and photos and build the site's data | You |
| `tests/`, `pipeline/tests/` | Tests | You |
| `data/`, `media/`, `pipeline/snapshot/`, `curation/media_manifest.json`, `CREDITS.md`, `reports/` | **Generated.** Never edit or commit by hand | The pipeline |

Formats are documented in [`docs/data-format.md`](docs/data-format.md); how the screens are
written, in [`app/README.md`](app/README.md); the pipeline, in
[`pipeline/README.md`](pipeline/README.md).

## What you can change freely, and what needs an issue first

**Easy to extend, open a pull request directly:**

- A new bestiary, or a yearly update to one (see [Bestiaries](#bestiaries)).
- Written texts for a species or a group.
- Rows in `curation/clades.csv` that complete the tree.
- Photo fixes (`curation/media_overrides.csv`) and video links (`videos.csv`).
- Bug fixes, and new screens or games that follow the pattern in `app/README.md`.
- A new data source in the pipeline (`pipeline/sources.py` and a builder in `pipeline/facts.py`).

**Core, open an issue and agree on it before writing code:**

- Anything that needs a server, an account, a build step, a framework or a new dependency.
- The format of saved progress and backup copies (it is versioned; a change needs a migration).
- The grading rules (accents and ñ count, capitals don't), the scheduler (FSRS) or the rule for
  "mastered" (Hard answers without hints).
- The format of the generated data.
- Any request to a site other than ours, beyond a YouTube video the student chooses to load.

## Rules that always apply

1. **Credit everything.** Every fact cites a source, every photo carries its author and licence,
   every written text lists its sources. Sources must be pages you or your agent actually opened,
   with their link. Never cite from memory.
2. **Licences.** Code is MIT; data CC BY-NC-SA 4.0; written texts CC BY-SA 4.0 (they adapt
   Wikipedia); photos keep their own licence. Photo licences that forbid changes ("ND") are never
   accepted.
3. **Only publish what you have the right to publish.** Contribute your own compiled list of
   species (names, classes, orders), not a copy of someone else's document, such as a course's
   PDF.
4. **Privacy.** No cookies, analytics or tracking, and no new requests to other sites.
5. **Spanish and English.** Every string on screen exists in both languages. Spanish text has
   correct accents, ñ and ü, and doesn't address the reader with gendered words.
6. **Generated files come from the pipeline**, never from an edit.

## Bestiaries

A bestiary (in the code, a *collection*) is the species list for one identification exam. Anyone
may add one; we review every pull request.

**To add one,** create `collections/<id>/` with `collection.csv` and `species.csv`. Copy the
vertebrates' files as a model; [`COLECCIONES.md`](COLECCIONES.md) explains every column and how
to save from Excel. Open the pull request with only those files. Our checks fetch names, facts
and photos for the new species, build the data and run the tests; the build report appears under
the pull request's **Checks** tab. When it's merged, the site republishes and a collection picker
appears in Settings.

**Studying stays separate.** Each bestiary keeps its own progress and backup copies; a student of
one never sees another's.

**Enrichment is shared.** Photos, written texts, facts, videos and the tree belong to the species,
not to the bestiary. Improving a species' card improves it for every bestiary that includes it.

**A species has one set of exam answers.** Every bestiary that includes a species must agree on
its class, order, scientific name and common name, and the build stops if they don't. If your
course names something differently from what is already here, keep the existing answer and add a
row to `curation/corrections.csv` with your course's name for it: `confidence: course`, `collection:` your
collection's id, a source, notes in Spanish and English, and `status: accepted`. Once merged, the
card says that your course writes it that way and which answer the tool accepts.

**Your own site.** You can also copy this repository on GitHub (fork it), switch on GitHub Pages
and edit the collections, and you'll have your own site with no server. Improvements to shared
species are welcome back here as pull requests.

## Written texts

- Draft from sources you opened (Wikipedia, Wiktionary, scientific databases, field guides), in
  your own words, and list each source in the file's `sources` with its link and licence.
- Set `"status": "draft"`. The site marks drafts so students know a person hasn't checked them yet.
- Say *why* a name was given (an etymology, a link to a feature) only when a source says so. If
  you can't source part of a text, leave that part out.
- Write both `es` and `en`. Keep texts short and concrete: they are study aids.

## Code

- Follow the pattern in `app/README.md`: a screen renders a template, handlers are declared once
  with `App.on`, repeated markup uses the shared helpers, styling lives in `style.css`.
- Readable and compact beats clever. No new dependencies without an issue first.
- Update the documentation that your change touches in the same pull request.

## Tests

Every pull request must pass all three layers, and a change in behaviour adds a test to the
matching one:

| You changed | Add a test in | Run it with |
|-------------|---------------|-------------|
| The pipeline (Python) | `pipeline/tests/` | `.venv/bin/python -m unittest discover -s pipeline/tests` |
| Grading, scheduling, sessions (`app/engine.js`) | `tests/engine.html` | open it in Chrome; it prints `RESULT: PASS` |
| Anything on screen | a scenario in `tests/harness.html`, with its expected results in `tests/run-scenarios.sh` | see below |

Set up once (macOS or Linux; on Windows use `.venv\Scripts\python`):

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

Then run everything:

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # or google-chrome on Linux
.venv/bin/python pipeline/build.py
.venv/bin/python -m unittest discover -s pipeline/tests
"$CHROME" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=8000 \
  --dump-dom "file://$PWD/tests/engine.html" | grep -o 'RESULT: [A-Z]*'
.venv/bin/python tests/fixture_site.py /tmp/visu-site
bash tests/run-scenarios.sh "$CHROME" /tmp/visu-site
```

Running the build rewrites generated files. Don't commit them: `git restore data media CREDITS.md
reports` before committing.

Passing tests are necessary but not enough: run your change and see it work, in the browser for
anything on screen, at a phone width as well as a desktop one.

## Opening the pull request

Use the template GitHub shows you. It asks for:

- **What changed and why**, in a few sentences.
- **How you checked it:** the commands you ran and their results, and what you looked at in the
  browser.
- **Sources** for any new fact or text.
- **AI use:** whether an AI agent wrote any of it, and what a person reviewed (especially facts and
  texts).

Keep each pull request to one topic: a bestiary, a batch of texts, a bug fix. Small pull requests
are reviewed sooner.

**What happens next.** Our checks run on your pull request and post a build report. Because the
checks can't write to your copy of the repository, a maintainer moves your branch into ours before
merging; there the checks regenerate the data and photos and commit them. You don't need to do
anything for that step.

## Instructions for your AI agent

Paste this into your agent along with your request:

> You are contributing to the VISU Study Tool. Before changing anything, read `CONTRIBUTING.md`,
> `docs/data-format.md` and `app/README.md`, and follow them.
>
> - Change only inputs: `collections/`, `content/`, `curation/*.csv` (not `media_manifest.json`),
>   `app/`, `pipeline/`, tests and docs. Never edit or commit `data/`, `media/`,
>   `pipeline/snapshot/`, `curation/media_manifest.json`, `CREDITS.md` or `reports/`.
> - Every fact and text must come from a page you fetched in this task, cited with its link and
>   licence. Never write facts from memory. If you can't source something, leave it out and say so.
> - Write every on-screen string and every text in Spanish and English.
> - Run the full test suite from `CONTRIBUTING.md`, add a test for any behaviour you change, and
>   open the changed screens in a browser at desktop and phone widths.
> - In the pull request, list the commands you ran with their results, what you could not verify,
>   and state that you are an AI agent. Keep to one topic.

---

## Resumen en español

- Un tema por pull request, con una descripción de qué cambia, por qué y cómo lo has comprobado.
- Cada dato, foto y texto indica su fuente, con un enlace que has abierto de verdad.
- Cambia solo las **entradas** (listas de especies, textos, código, pruebas, documentación). No
  subas los archivos generados (`data/`, `media/`, etc.): los regeneramos antes de fusionar.
- Todo cambio de comportamiento lleva una prueba, y todas las pruebas pasan.
- Si has usado un agente de IA, dilo, y di qué ha revisado una persona.
- **Bestiarios:** cualquiera puede añadir uno en `collections/<id>/` (ver
  [`COLECCIONES.md`](COLECCIONES.md)). Cada bestiario guarda su propio progreso; las fotos, los
  textos y los datos de cada especie son comunes. Si tu curso nombra una especie de otra forma,
  mantén la respuesta que ya existe y añade una nota de tipo `course` en `curation/corrections.csv`.
- Publica solo lo que tienes derecho a publicar: tu propia lista, no el documento de otra persona.
