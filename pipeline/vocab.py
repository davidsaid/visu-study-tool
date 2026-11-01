"""Spanish and English display text for the categorical values found in the datasets.

Each table maps a dataset value to (es, en). Values not in a table are skipped and listed
in reports/build-report.md (`UNKNOWN`), so a new value shows up instead of leaking
untranslated English into a Spanish card.
"""
import re

UNKNOWN = set()

CONTINENTS = {
    "Africa": ("África", "Africa"), "Asia": ("Asia", "Asia"), "Europe": ("Europa", "Europe"),
    "North America": ("América del Norte", "North America"), "South America": ("América del Sur", "South America"),
    "Oceania (Continent)": ("Oceanía", "Oceania"), "Oceania": ("Oceanía", "Oceania"),
    "Antarctica": ("Antártida", "Antarctica"),
}

AVONET_HABITAT = {
    "Forest": ("Bosque", "Forest"), "Woodland": ("Bosque abierto y arbolado", "Woodland"),
    "Grassland": ("Pastizal", "Grassland"), "Shrubland": ("Matorral", "Shrubland"),
    "Wetland": ("Humedales", "Wetlands"), "Riverine": ("Ríos y riberas", "Rivers and riverbanks"),
    "Rock": ("Roquedos", "Rocky areas"), "Desert": ("Desierto", "Desert"),
    "Marine": ("Marino", "Marine"), "Coastal": ("Costas", "Coasts"),
    "Human Modified": ("Medios humanizados (campos, pueblos, ciudades)", "Human-modified land (farmland, towns)"),
}

AMPHIBIO_HABITAT = {
    "Fos": ("fosorial (excava)", "fossorial (burrowing)"), "Ter": ("terrestre", "terrestrial"),
    "Aqu": ("acuático", "aquatic"), "Arb": ("arborícola", "arboreal"),
}

REPT_HABITAT = {
    "terrestrial": ("terrestre", "terrestrial"), "arboreal": ("arborícola", "arboreal"),
    "saxicolous": ("rupícola (rocas)", "saxicolous (rocks)"), "fossorial": ("fosorial (excava)", "fossorial (burrowing)"),
    "semi-aquatic": ("semiacuático", "semi-aquatic"), "aquatic": ("acuático", "aquatic"),
    "marine": ("marino", "marine"), "cryptic": ("críptico (bajo hojarasca o piedras)", "cryptic (under litter or stones)"),
}

ELTON_DIET = {
    "Diet-Inv": ("invertebrados", "invertebrates"),
    "Diet-Vend": ("vertebrados endotermos", "endothermic vertebrates"),
    "Diet-Vect": ("vertebrados ectotermos", "ectothermic vertebrates"),
    "Diet-Vfish": ("peces", "fish"), "Diet-Vunk": ("vertebrados (sin precisar)", "vertebrates (unspecified)"),
    "Diet-Scav": ("carroña", "carrion"), "Diet-Fruit": ("frutos", "fruit"), "Diet-Nect": ("néctar", "nectar"),
    "Diet-Seed": ("semillas", "seeds"), "Diet-PlantO": ("otras partes de plantas", "other plant material"),
}

AMPHIBIO_DIET = {
    "Arthro": ("artrópodos", "arthropods"), "Vert": ("vertebrados", "vertebrates"),
    "Leaves": ("hojas", "leaves"), "Flowers": ("flores", "flowers"), "Seeds": ("semillas", "seeds"),
    "Fruits": ("frutos", "fruit"),
}

REPT_DIET = {
    "carnivorous": ("carnívoro", "carnivorous"), "herbivorous": ("herbívoro", "herbivorous"),
    "omnivorous": ("omnívoro", "omnivorous"),
}

REPT_REPRO = {
    "oviparous": ("ovíparo", "oviparous"), "viviparous": ("vivíparo", "viviparous"),
    "ovoviviparous": ("ovovivíparo", "ovoviviparous"),
}

ACTIVITY = {
    "nocturnal": ("nocturno", "nocturnal"), "diurnal": ("diurno", "diurnal"),
    "crepuscular": ("crepuscular", "crepuscular"),
    "cathemeral": ("catemeral (activo de día y de noche)", "cathemeral (active by day and night)"),
}

MIGRATION = {
    1.0: ("Sedentaria", "Sedentary"), 2.0: ("Migradora parcial", "Partial migrant"), 3.0: ("Migradora", "Migratory"),
}

# Tree of Sex and ReptTraits values. Values that say nothing about the mechanism map to None.
SEXDET = {
    "xy": ("XY", "XY"), "zw": ("ZW", "ZW"),
    "complex xy": ("XY complejo (varios cromosomas sexuales)", "complex XY (several sex chromosomes)"),
    "complex zw": ("ZW complejo (varios cromosomas sexuales)", "complex ZW (several sex chromosomes)"),
    "homomorphic": ("cromosomas sexuales indiferenciados", "undifferentiated sex chromosomes"),
    "male heterogametic": ("macho heterogamético", "male heterogametic"),
    "female heterogametic": ("hembra heterogamética", "female heterogametic"),
    "gsd": ("determinación genética (GSD)", "genetic sex determination (GSD)"),
    "gsd (xx/xy)": ("determinación genética XX/XY", "genetic XX/XY"),
    "gsd (zw/zz)": ("determinación genética ZZ/ZW", "genetic ZZ/ZW"),
    "tsd": ("determinación por la temperatura de incubación (TSD)", "temperature-dependent sex determination (TSD)"),
    "tsd ia": ("TSD tipo Ia: las temperaturas altas producen hembras", "TSD type Ia: warm incubation gives females"),
    "tsd ib": ("TSD tipo Ib: las temperaturas altas producen machos", "TSD type Ib: warm incubation gives males"),
    "tsd ii": ("TSD tipo II: hembras a temperaturas extremas, machos a intermedias",
               "TSD type II: females at extreme temperatures, males at intermediate ones"),
    "hermaphrodite": ("hermafrodita", "hermaphrodite"),
    "gonochorous": None,      # separate sexes: true of nearly all vertebrates, not a mechanism
}


def translate_tokens(value, table):
    """Split a multi-valued cell ('Arboreal/Terrestrial', 'A&B', 'a | b') and translate each part.

    Returns (es_list, en_list), or None when nothing translatable is left.
    """
    if value is None:
        return None
    lookup = {k.lower(): v for k, v in table.items()}
    es, en = [], []
    tokens = []
    for part in re.split(r"\s*(?:\||&|;)\s*", str(value)):
        # 'GSD (XX/XY)' is one value; 'Arboreal/Terrestrial' is two.
        tokens += [part] if part.strip().strip("*").lower() in lookup else re.split(r"\s*/\s*", part)
    for token in tokens:
        key = token.strip().strip("*").strip().lower()
        if not key or key in ("na", "none", "unknown"):
            continue
        if key not in lookup:
            UNKNOWN.add(token.strip())
            continue
        if lookup[key] is None:
            continue
        if lookup[key][0] not in es:
            es.append(lookup[key][0])
            en.append(lookup[key][1])
    return (es, en) if es else None


IUCN = {
    "LC": ("Preocupación menor", "Least Concern"), "NT": ("Casi amenazada", "Near Threatened"),
    "VU": ("Vulnerable", "Vulnerable"), "EN": ("En peligro", "Endangered"),
    "CR": ("En peligro crítico", "Critically Endangered"), "EW": ("Extinta en estado silvestre", "Extinct in the Wild"),
    "EX": ("Extinta", "Extinct"), "DD": ("Datos insuficientes", "Data Deficient"),
    "NE": ("No evaluada", "Not Evaluated"),
}

# FishBase (species.DemersPelag, Fresh/Brack/Saltwater, AnaCat, length types; ecology.FeedingType,
# Herbivory2; FAO area names).
FISH_ZONE = {
    "demersal": ("demersal (cerca del fondo)", "demersal (near the bottom)"),
    "benthopelagic": ("bentopelágico (entre el fondo y la columna de agua)", "benthopelagic (between the bottom and open water)"),
    "pelagic-oceanic": ("pelágico oceánico (mar abierto)", "pelagic-oceanic (open ocean)"),
    "pelagic-neritic": ("pelágico nerítico (aguas sobre la plataforma)", "pelagic-neritic (waters over the shelf)"),
    "pelagic": ("pelágico (columna de agua)", "pelagic (open water)"),
    "bathydemersal": ("batidemersal (fondos profundos)", "bathydemersal (deep bottoms)"),
    "bathypelagic": ("batipelágico (aguas profundas)", "bathypelagic (deep open water)"),
    "reef-associated": ("asociado a arrecifes", "reef-associated"),
}
FISH_WATER = {"freshwater": ("agua dulce", "freshwater"), "brackish": ("salobre", "brackish"), "marine": ("marino", "marine")}
FISH_MIGRATION = {
    "oceanodromous": ("Oceanódromo: migra dentro del mar", "Oceanodromous: migrates within the sea"),
    "anadromous": ("Anádromo: vive en el mar y remonta los ríos para reproducirse", "Anadromous: lives at sea and runs up rivers to spawn"),
    "catadromous": ("Catádromo: vive en agua dulce y baja al mar para reproducirse", "Catadromous: lives in fresh water and goes to sea to spawn"),
    "amphidromous": ("Anfídromo: se mueve entre agua dulce y mar, no para reproducirse", "Amphidromous: moves between fresh water and the sea, not to spawn"),
    "potamodromous": ("Potamódromo: migra dentro del agua dulce", "Potamodromous: migrates within fresh water"),
    "oceano-estuarine": ("Migra entre el mar y los estuarios", "Migrates between the sea and estuaries"),
    "non-migratory": ("No migratorio", "Non-migratory"),
}
FISH_LENGTH = {"TL": ("longitud total", "total length"), "SL": ("longitud estándar", "standard length"),
               "FL": ("longitud a la horquilla", "fork length"), "WD": ("anchura del disco", "disc width"),
               "NG": ("longitud", "length"), "OT": ("longitud", "length")}
FISH_FEEDING = {
    "hunting macrofauna (predator)": ("depredador (caza animales grandes)", "predator (hunts large animals)"),
    "variable": ("variable", "variable"),
    "filtering plankton": ("filtra plancton", "filters plankton"),
    "selective plankton feeding": ("come plancton seleccionándolo", "picks plankton selectively"),
    "grazing on aquatic plants": ("pasta plantas acuáticas", "grazes aquatic plants"),
    "browsing on substrate": ("ramonea sobre el fondo", "browses on the bottom"),
    "picking parasites off a host (cleaner)": ("limpiador (come parásitos de otros peces)", "cleaner (eats parasites off other fish)"),
}
FISH_DIET = {
    "mainly animals (troph. 2.8 and up)": ("sobre todo animales", "mainly animals"),
    "plants/detritus+animals (troph. 2.2-2.79)": ("plantas o detritos y animales", "plants or detritus and animals"),
    "mainly plants/detritus (troph. 2-2.19)": ("sobre todo plantas o detritos", "mainly plants or detritus"),
}
FAO_AREAS = {
    "Atlantic, Northeast": ("Atlántico nororiental", "Northeast Atlantic"),
    "Atlantic, Northwest": ("Atlántico noroccidental", "Northwest Atlantic"),
    "Atlantic, Eastern Central": ("Atlántico centro-oriental", "Eastern Central Atlantic"),
    "Atlantic, Western Central": ("Atlántico centro-occidental", "Western Central Atlantic"),
    "Atlantic, Southeast": ("Atlántico suroriental", "Southeast Atlantic"),
    "Atlantic, Southwest": ("Atlántico suroccidental", "Southwest Atlantic"),
    "Atlantic, Antarctic": ("Atlántico antártico", "Antarctic Atlantic"),
    "Mediterranean and Black Sea": ("Mediterráneo y mar Negro", "Mediterranean and Black Sea"),
    "Indian Ocean, Western": ("Índico occidental", "Western Indian Ocean"),
    "Indian Ocean, Eastern": ("Índico oriental", "Eastern Indian Ocean"),
    "Indian Ocean, Antarctic": ("Índico antártico", "Antarctic Indian Ocean"),
    "Pacific, Northwest": ("Pacífico noroccidental", "Northwest Pacific"),
    "Pacific, Northeast": ("Pacífico nororiental", "Northeast Pacific"),
    "Pacific, Western Central": ("Pacífico centro-occidental", "Western Central Pacific"),
    "Pacific, Eastern Central": ("Pacífico centro-oriental", "Eastern Central Pacific"),
    "Pacific, Southwest": ("Pacífico suroccidental", "Southwest Pacific"),
    "Pacific, Southeast": ("Pacífico suroriental", "Southeast Pacific"),
    "Pacific, Antarctic": ("Pacífico antártico", "Antarctic Pacific"),
    "Arctic Ocean": ("océano Ártico", "Arctic Ocean"),
    "Europe - Inland waters": ("aguas continentales de Europa", "inland waters of Europe"),
    "Asia - Inland waters": ("aguas continentales de Asia", "inland waters of Asia"),
    "Africa-Inland Waters": ("aguas continentales de África", "inland waters of Africa"),
    "America, North - Inland waters": ("aguas continentales de Norteamérica", "inland waters of North America"),
    "America, South - Inland waters": ("aguas continentales de Sudamérica", "inland waters of South America"),
    "Oceania - Inland waters": ("aguas continentales de Oceanía", "inland waters of Oceania"),
    "Antarctica - Inland waters": ("aguas continentales de la Antártida", "inland waters of Antarctica"),
}
# Animal Diversity Web "Sexual Dimorphism" keywords.
ADW_DIMORPHISM = {
    "male larger": ("el macho es más grande", "males are larger"),
    "female larger": ("la hembra es más grande", "females are larger"),
    "sexes alike": ("machos y hembras son parecidos", "males and females look alike"),
    "ornamentation": ("uno de los sexos tiene adornos", "one sex has ornaments"),
    "sexes colored or patterned differently": ("los sexos tienen distinto color o diseño", "the sexes differ in colour or pattern"),
    "male more colorful": ("el macho es más vistoso", "males are more colourful"),
    "female more colorful": ("la hembra es más vistosa", "females are more colourful"),
    "sexes shaped differently": ("los sexos tienen distinta forma", "the sexes differ in shape"),
}


def lookup(table, value):
    """table[value] or None; an unknown value is recorded for the build report."""
    if value in table:
        return table[value]
    UNKNOWN.add(str(value))
    return None
