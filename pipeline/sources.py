"""The source registry: every dataset or service a fact, a name or a tree node can come from.

`download` is the direct file URL that refresh.py fetches into .cache/datasets/<id>.<ext>;
`member` is the file inside a zip. Sources without `download` are live APIs or web pages.

Non-commercial sources (FishBase, Animal Diversity Web) are used since 2026-11-01, so the compiled data
is CC BY-NC-SA 4.0. Left out (see docs/data-sources.md): SeaLifeBase (thin, values on the wrong taxa),
the Enciclopedia Virtual de los Vertebrados Españoles (CC BY-NC-ND: a reference for writers only), and
GoaT (its data licence could not be verified).
"""

SOURCES = {
    "amniote_lhd": {
        "title": "Amniote Life History Database (Myhrvold et al. 2015)",
        "url": "https://doi.org/10.6084/m9.figshare.3563457.v1",
        "license": "CC0 1.0",
        "download": "https://ndownloader.figshare.com/files/8067269",
        "file": "amniote_lhd.zip", "member": "Data_Files/Amniote_Database_Aug_2015.csv",
    },
    "anage": {
        "title": "AnAge: The Animal Ageing and Longevity Database, Build 15 (HAGR)",
        "url": "https://genomics.senescence.info/species/",
        "license": "CC BY 3.0 Unported (HAGR legal page, checked 2026-11-01)",
        "download": "https://genomics.senescence.info/species/dataset.zip",
        "file": "anage.zip", "member": "anage_data.txt",
    },
    "avonet": {
        "title": "AVONET (Tobias et al. 2022), BirdLife taxonomy",
        "url": "https://doi.org/10.6084/m9.figshare.16586228.v7",
        "license": "CC BY 4.0",
        "download": "https://ndownloader.figshare.com/files/34480856",
        "file": "avonet.xlsx", "sheet": "AVONET1_BirdLife",
    },
    "combine": {
        "title": "COMBINE: a coalesced mammal database of intrinsic and extrinsic traits (Soria et al. 2021), reported values",
        "url": "https://doi.org/10.6084/m9.figshare.13028255.v4",
        "license": "CC BY 4.0",
        "download": "https://ndownloader.figshare.com/files/27703263",
        "file": "combine.csv",
    },
    "elton": {
        "title": "EltonTraits 1.0 (Wilman et al. 2014)",
        "url": "https://doi.org/10.6084/m9.figshare.3559887.v1",
        "license": "CC0 1.0",
        "files": {
            "elton_mammals": {"download": "https://ndownloader.figshare.com/files/5631084", "file": "elton_mammals.txt"},
            "elton_birds": {"download": "https://ndownloader.figshare.com/files/5631081", "file": "elton_birds.txt"},
        },
    },
    "pantheria": {
        "title": "PanTHERIA (Jones et al. 2009)",
        "url": "https://doi.org/10.6084/m9.figshare.3531875.v1",
        "license": "CC0 1.0",
        "download": "https://ndownloader.figshare.com/files/5604752",
        "file": "pantheria.zip", "member": "PanTHERIA_1-0_WR05_Aug2008.txt",
    },
    "amphibio": {
        "title": "AmphiBIO v1 (Oliveira et al. 2017)",
        "url": "https://doi.org/10.6084/m9.figshare.4644424.v5",
        "license": "CC BY 4.0",
        "download": "https://ndownloader.figshare.com/files/8828578",
        "file": "amphibio.zip", "member": "AmphiBIO_v1.csv",
    },
    "repttraits": {
        "title": "ReptTraits v1-2 (Oskyrko et al. 2024)",
        "url": "https://doi.org/10.6084/m9.figshare.24572683.v4",
        "license": "CC BY 4.0",
        "download": "https://ndownloader.figshare.com/files/45408133",
        "file": "repttraits.xlsx", "sheet": "Data",
    },
    "squambase": {
        "title": "SquamBase 1.0 (Meiri et al. 2024)",
        "url": "https://doi.org/10.5061/dryad.76hdr7t3b",
        "license": "CC0 1.0",
        "download": "https://zenodo.org/api/records/10602503/files/Supplementary_Table_S1_-_squamBase1.xlsx/content",
        "file": "squambase.xlsx", "sheet": "data",
    },
    "tos": {
        "title": "Tree of Sex: a database of sexual systems (2014), vertebrate table",
        "url": "https://doi.org/10.5061/dryad.v1908",
        "license": "CC0 1.0",
        "download": "https://zenodo.org/api/records/4932291/files/vert.data-may19.csv/content",
        "file": "tos.csv",
    },
    "mdd": {
        "title": "Mammal Diversity Database v2.5",
        "url": "https://doi.org/10.5281/zenodo.21654811",
        "license": "CC BY 4.0",
        "download": "https://zenodo.org/api/records/21654811/files/MDD_v2.5_6904species.csv/content",
        "file": "mdd.csv",
    },
    "miteco": {
        "title": "MITECO: Listado de Especies Silvestres en Régimen de Protección Especial y Catálogo Español de Especies Amenazadas (tabla 30-06-2025)",
        "url": "https://www.miteco.gob.es/es/biodiversidad/temas/conservacion-de-especies/especies-proteccion-especial/ce-proteccion-listado-situacion.html",
        "license": "Reuse with attribution (MITECO aviso legal)",
        "download": "https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/temas/conservacion-de-especies/esp-prot-especial/TablaLESRPE-CEEA-30062025_v2.xlsx",
        "file": "miteco.xlsx", "sheet": "Normativa Especies",
    },
    "gbif": {
        "title": "GBIF Backbone Taxonomy (species/match and synonyms API)",
        "url": "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c",
        "license": "CC BY 4.0",
    },
    "gbif_iucn": {
        "title": "IUCN Red List category, via the GBIF species API",
        "url": "https://api.gbif.org/v1/species/{key}/iucnRedListCategory",
        "license": "The category may be reused freely; assessment text is not used",
    },
    "wikidata": {
        "title": "Wikidata",
        "url": "https://www.wikidata.org",
        "license": "CC0 1.0",
    },
    "inaturalist": {
        "title": "iNaturalist taxa API (taxon ids only)",
        "url": "https://api.inaturalist.org/v1/docs/",
        "license": "Taxon ids are identifiers, no licence needed",
    },
    "otl": {
        "title": "Open Tree of Life synthetic tree (induced subtree), used to check clade placements",
        "url": "https://tree.opentreeoflife.org",
        "license": "CC0 1.0",
    },
    "wikipedia_clades": {
        "title": "Wikipedia (EN/ES), clade and order articles linked on each tree node",
        "url": "https://en.wikipedia.org",
        "license": "CC BY-SA 4.0 (only names and placements are taken, no text)",
    },
    "sexdet_rule": {
        "title": "Wikipedia: Sex-determination system (class rule: mammals XY, birds ZW, monotremes with multiple X and Y)",
        "url": "https://en.wikipedia.org/wiki/Sex-determination_system",
        "license": "CC BY-SA 4.0 (rule stated in our own words)",
    },
    "fishbase": {
        "title": "FishBase (Froese & Pauly, eds.), version 04/2025, via the rfishbase Parquet snapshot",
        "url": "https://www.fishbase.se",
        "license": "CC BY-NC 4.0",
        "citation": "Froese, R. and D. Pauly. Editors. 2025. FishBase. www.fishbase.org, version (04/2025).",
    },
    "adw": {
        "title": "Animal Diversity Web (University of Michigan Museum of Zoology): sexual dimorphism keywords",
        "url": "https://animaldiversity.org",
        "license": "CC BY-NC-SA 3.0 (adapted under CC BY-NC-SA 4.0)",
    },
    "video_links": {
        "title": "Link check of the videos (YouTube/Vimeo oEmbed and watch page)",
        "url": "https://www.youtube.com/oembed",
        "license": "Status only; videos are embedded or linked, never copied",
    },
}


def dataset_files():
    """Yield (cache_key, source_id, spec) for every downloadable file."""
    for sid, spec in SOURCES.items():
        if "download" in spec:
            yield sid, sid, spec
        for key, sub in spec.get("files", {}).items():
            yield key, sid, sub
