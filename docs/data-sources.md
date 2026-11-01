# Data sources

*Why each source was chosen, what it covers and how it is licensed. Copied from the project
notes on 2026-11-01; `CREDITS.md` lists what the current build actually uses.*

**Created**: 2026-10-31
**Updated**: 2026-11-01 (non-commercial sources: FishBase, ADW, NC photos; licences split)
**Tags**: #data #licensing #sources #research

## Summary

Open data covers most of the card for free. A taxonomy and tree backbone, about ten open trait
datasets, Wikidata, the Spanish catalogue, and openly licensed photos together reach 240–308
of the 308 species on every structured field. **No source, open or paid, offers
redistributable text** for the fields that matter most for a sight exam: field marks,
look-alike species, the description of dimorphism, and etymology. Those must be written by
hand from cited sources. Paid products do not change this, because none of them allows
redistribution. Their value is as references for whoever writes the text.

Every coverage number below was measured on 2026-10-31 by research scripts against the
2026-27 species list. The current coverage is in `reports/build-report.md`.

## Recommended stack

| Need | Primary | Fallback | Coverage (of 308) | License |
|------|---------|----------|-------------------|---------|
| Name authority | [Catalogue of Life](https://www.catalogueoflife.org) (2026-10-14) | GBIF, plus [MDD v2.5](https://zenodo.org/records/21654811) for mammals | 308; 5 synonyms flagged | CC BY |
| Tree topology | [Open Tree of Life](https://api.opentreeoflife.org/v3/tree_of_life/induced_subtree) induced subtree | NCBI lineage, used for names | 308 tips; 307 branching nodes, 97 named | CC0 |
| Clade labels | Curated overlay of ~25–40 nodes, ES/EN | — | — | ours |
| Deep path (Life → Vertebrata) | OTT lineage, ES/EN names curated by hand | NCBI | — | CC0 + ours |
| Spanish names | The collection's list, which is canonical | IOC 15.2 (birds), GBIF vernaculars, Wikidata P1843, MITECO | 235 agree with at least one source | — |
| Mass, length, by sex | [Amniote LHD](https://figshare.com/articles/dataset/3563457), [AVONET](https://figshare.com/articles/dataset/16586228), [PanTHERIA](https://figshare.com/articles/dataset/3531875), [COMBINE](https://figshare.com/articles/dataset/13028255), [AmphiBIO](https://figshare.com/articles/dataset/4644424), [ReptTraits](https://figshare.com/articles/dataset/24572683), [SquamBase](https://zenodo.org/records/10602503) | AnAge | mass 274, length 201, by sex 153 | CC0 / CC BY |
| Diet | [EltonTraits](https://figshare.com/articles/dataset/3559887), AmphiBIO, ReptTraits, AVONET | Wikidata | 240 | CC0 / CC BY |
| Sex determination | [Tree of Sex](https://zenodo.org/records/4932291), ReptTraits, GoaT | Class rule: mammals XY, birds ZW, monotremes as exceptions | 151 measured; ≈290 with the rule | CC0 / CC BY |
| Lifespan, reproduction | AnAge, Amniote LHD | ReptTraits, AmphiBIO | 281 / 256 | CC BY 3.0 (HAGR, verified 2026-11-01 at genomics.senescence.info/legal.html) / CC0 |
| Habitat, activity | AVONET, COMBINE, AmphiBIO, ReptTraits | Wikidata | 241 / 164 | CC0 / CC BY |
| Distribution (text) | MDD countries, Wikidata P183/P9714, AVONET | Authored text | 280 | CC BY / CC0 |
| Fishes: distribution, habitat, diet, length, weight, migration; lifespan fallback | [FishBase](https://www.fishbase.se) 04/2025 (rfishbase Parquet snapshot), each fact linking the species' page | — | 66 of 66 fishes (added 2026-11-01) | CC BY-NC 4.0 |
| Sexual dimorphism category (male larger, sexes alike, colour…) | [Animal Diversity Web](https://animaldiversity.org), fallback after the size ratio | — | +120 species; dimorphism on 198 of 308 (added 2026-11-01) | CC BY-NC-SA 3.0 |
| IUCN category | GBIF IUCN endpoint | Wikidata P141 | 308 | Category use is unrestricted |
| Spanish legal status | [MITECO LESRPE/CEEA](https://www.miteco.gob.es/es/biodiversidad/temas/conservacion-de-especies/especies-proteccion-especial/ce-proteccion-listado-situacion.html) table, 30-06-2025 | — | 99 listed; absence is meaningful | Reuse with attribution |
| Photos | iNaturalist research grade, CC0/BY/BY-SA, and since 2026-11-01 BY-NC/BY-NC-SA (never ND), self-hosted | Wikimedia Commons (P18 + category) | 284 with ≥10 photos; 298 with ≥10 on Commons | per photo |
| Male / female / juvenile photos | iNat annotations | Manual tags in `overrides.yaml` | 5–15% of observations are tagged | per photo |
| Silhouettes (tree icons) | [PhyloPic](https://www.phylopic.org) CC0/BY | — | 283 at species or genus level | per image |
| Range maps | Commons maps (Wikidata P181), self-hosted | GBIF occurrence-density tiles as a live layer | 256 / 308 | per file / GBIF |
| Video | Public YouTube videos, one per species (`collections/<id>/videos.csv`), credited to their channel, embedded from `youtube-nocookie.com` behind click-to-load | — | 308 (300 embeddable) | embed only |
| Bird calls | xeno-canto v3 (free key, kept as a build secret) | — | 77 of 80 birds have ≥10 recordings | per recording, mostly NC |
| Field marks, look-alikes, dimorphism text, etymology, clade traits | **Authored ES/EN** text, citing Wikipedia, EVVE, BOW, ADW and papers | ReptTraits colour/pupil (15 reptiles) | 0 structured | our text license |

## Sources we use only as references, never copied

| Source | Why |
|--------|-----|
| SeaLifeBase | CC BY-NC. Only 28 non-fish species, thin, and some values attached to the wrong taxa (*Lutra lutra* with orca values) |
| [Enciclopedia Virtual de los Vertebrados Españoles](https://digital.csic.es/handle/10261/104752) (MNCN-CSIC) | CC BY-NC-ND on Digital.CSIC (the vertebradosibericos.org copy says all rights reserved). Monographs for 100 of the species. Facts in Spanish prose do not parse reliably; enter facts by hand, citing the Digital.CSIC DOI, never text |
| Wikipedia ES/EN | CC BY-SA. Source of the drafted texts in `content/`, which therefore stay CC BY-SA 4.0 |
| Birds of the World (~US$49/yr, NOT VERIFIED), HMW (€1,125) | No redistribution allowed. The best bird and mammal identification references for an author |
| IUCN Red List API and range maps | Only the category may be redistributed. Not assessment text, not polygons. IBAT commercial from US$5,000/yr |
| TimeTree (divergence ages) | Its terms forbid redistribution. Link out, or ask for permission |

## Data-quality traps the pipeline must handle

- **Wikidata body mass is often birth weight.** It carries the qualifier P3831. Of 80 species
  we could compare, 33 are off by more than 3×. Never use raw P2067.
- **Synonym matches can describe a different taxon.** About half of the "rescued" matches are
  a recently split species mapped to its old parent, for example *Bufo spinosus* → *B. bufo*
  or *Lama guanicoe* → *L. glama*. Store `match_type` and flag `parent_of_split`.
- **OTL concept errors** need hand pins: *Equus quagga* maps to the extinct quagga
  subspecies, and *Ovis gmelini* to the mouflon. Three tips are "broken" in synthesis
  (*Tyto alba*, *Apteryx australis*, *Oenanthe hispanica*).
- **Sources disagree.** The lynx's head–body length is 960, 1030 or at most 875 mm depending
  on the source. The card shows ranges with their source, never one "true" number.
- **Staleness.** Several sources still list the lynx as EN; it is VU. Take IUCN categories from
  the live feed. The MITECO table predates Orden TED/1096/2026.
- **A list's names** may contain typos and regional usage ("Bonito" for *Thunnus alalunga*).
  Surface these as notes on the cards; never auto-correct the answers.

## Licensing model (decided 2026-11-01)

- Code: MIT, like `davidsaid/tenebrio-photoperiod-rig`.
- Data (facts, lists, curation): **CC BY-NC-SA 4.0**, because FishBase (CC BY-NC) and Animal
  Diversity Web (CC BY-NC-SA) allow only non-commercial use. Ads, sponsorship or paid use would
  break their licences.
- Drafted texts (`content/`): **CC BY-SA 4.0**, because they adapt Wikipedia (CC BY-SA), whose
  share-alike licence is not compatible with NC.
- Media: each file keeps its own license: CC0, CC BY, CC BY-SA, CC BY-NC or CC BY-NC-SA. Never ND
  (no derivatives): a crop box would make an adaptation. Resizing is not an adaptation under
  CC 4.0 (legal code §2(a)(4)).
- Videos are embedded, not copied, and credited to their channel.

This is legal reasoning, not legal advice. The EU database right (Directive 96/9/EC) makes
bulk extraction of facts from NC databases riskier than citing a few facts per species.

## References

- `CREDITS.md`: every source the build uses, with licence and link
- `docs/data-format.md`: the data files
- `reports/build-report.md`: current coverage per field
