"""Turn snapshot rows into bilingual, credited facts (docs/data-format.md, "Fact").

One fact per field, from the first source in the stack of docs/data-sources.md
that has a value. Rules that the contract and the research impose:

- every fact carries `src` (keys into the source registry);
- a value matched through a synonym that is a split species mapped to its old parent
  (`parent_of_split`) is dropped, never shown;
- raw Wikidata mass (P2067) is never used: it is often birth weight;
- dimorphism is stated only when a dataset's male/female mass or length ratio supports it;
- sex determination from the class rule is marked `match: "rule"` with a note.
"""
import re

from vocab import (ACTIVITY, ADW_DIMORPHISM, AMPHIBIO_DIET, AMPHIBIO_HABITAT, AVONET_HABITAT, CONTINENTS,
                   ELTON_DIET, FAO_AREAS, FISH_DIET, FISH_FEEDING, FISH_LENGTH, FISH_MIGRATION, FISH_WATER,
                   FISH_ZONE, IUCN, MIGRATION, REPT_DIET, REPT_HABITAT, REPT_REPRO, SEXDET, lookup, translate_tokens)

FIELDS = ["distribution", "habitat", "diet", "mass", "length", "dimorphism", "sex_determination",
          "lifespan", "reproduction", "activity", "migration", "iucn", "spain"]
DATASET_SOURCE = {"elton_mammals": "elton", "elton_birds": "elton"}
FISH = {"Actinopterygii", "Chondrichthyes", "Sarcopterygii", "Hyperoartia", "Myxini"}


# --------------------------------------------------------------------------- number formatting

def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.match(r"^\s*[<>~≈]?\s*(-?\d+(?:\.\d+)?)", str(v).split("|")[0])
    return float(m.group(1)) if m else None


def fmt(x, lang, sig=3):
    """Round to `sig` significant figures; decimal comma and space thousands in Spanish."""
    if x == 0:
        return "0"
    digits = max(0, sig - 1 - int(f"{abs(x):e}".split("e")[1]))
    s = f"{round(x, digits):,.{digits}f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    if lang == "es":
        s = s.replace(",", " ").replace(".", ",")
        if re.fullmatch(r"\d \d{3}", s):     # RAE: no separator in four-digit numbers
            s = s.replace(" ", "")
    return s


def mass(g, lang):
    if g < 1:
        return f"{fmt(g * 1000, lang)} mg"
    if g < 1000:
        return f"{fmt(g, lang)} g"
    if g < 1_000_000:
        return f"{fmt(g / 1000, lang)} kg"
    return f"{fmt(g / 1_000_000, lang)} t"


def length(mm, lang):
    if mm < 10:
        return f"{fmt(mm, lang)} mm"
    if mm < 1000:
        return f"{fmt(mm / 10, lang)} cm"
    return f"{fmt(mm / 1000, lang)} m"


def years(y, lang):
    unit = {"es": ("año", "años"), "en": ("year", "years")}[lang]
    return f"{fmt(y, lang)} {unit[0] if fmt(y, lang) == '1' else unit[1]}"


def days(d, lang):
    unit = {"es": ("día", "días"), "en": ("day", "days")}[lang]
    return f"{fmt(d, lang)} {unit[0] if fmt(d, lang) == '1' else unit[1]}"


def age(d, lang):
    """Ages at maturity: days under a year, years above."""
    if d < 365:
        return days(d, lang)
    y = d / 365.25
    unit = {"es": ("año", "años"), "en": ("year", "years")}[lang]
    return f"{fmt(y, lang, 2)} {unit[0] if fmt(y, lang, 2) == '1' else unit[1]}"


def join(items, lang):
    items = list(items)
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + (" y " if lang == "es" else " and ") + items[-1]


def cap(s):
    return s[:1].upper() + s[1:] if s else s


# --------------------------------------------------------------------------- record access

class Species:
    """Dataset rows for one species, with parent-of-split matches removed."""

    def __init__(self, sp, traits, classify):
        self.sp = sp
        self.rows, self.dropped = {}, []
        for ds, hits in traits.items():
            hit = hits.get(sp["binomial"])
            if not hit:
                continue
            match = classify(sp["binomial"], hit)
            if match == "parent_of_split":
                self.dropped.append({"dataset": ds, "matched_name": hit["name"], "via": hit["via"]})
            else:
                self.rows[ds] = (hit["v"], match)

    def get(self, ds, col):
        row = self.rows.get(ds)
        return row[0].get(col) if row else None

    def n(self, ds, col):
        return num(self.get(ds, col))

    def match(self, ds):
        return self.rows[ds][1]


class Fact:
    def __init__(self, field):
        self.field, self.es, self.en, self.src, self.matches, self.note = field, [], [], [], [], None

    def add(self, s, ds, es, en):
        self.es.append(es)
        self.en.append(en)
        self.use(s, ds)

    def use(self, s, ds):
        src = species_source(s, ds)
        if src not in self.src:
            self.src.append(src)
        if ds in s.rows:
            self.matches.append(s.match(ds))

    def done(self, sep=" · "):
        if not self.es or not self.src:
            return None
        match = "rule" if "rule" in self.matches else ("synonym" if "synonym" in self.matches else "exact")
        return {"field": self.field, "es": sep.join(self.es), "en": sep.join(self.en), "src": self.src,
                "match": match, "note": self.note}


def species_source(s, ds):
    """The source key of a value. FishBase and ADW values cite the species' own page (their licences ask
    for the link), as "fishbase:<SpecCode>" and "adw:<Genus_species>"; build.py registers those keys."""
    if ds == "fishbase" and s.n("fishbase", "SpecCode"):
        return f"fishbase:{int(s.n('fishbase', 'SpecCode'))}"
    if ds == "adw" and "adw" in s.rows:
        return "adw:" + s.rows["adw"][0]["url"].rstrip("/").rsplit("/", 1)[-1]
    return DATASET_SOURCE.get(ds, ds)


def first(s, options):
    """First (dataset, column, number) that has a value."""
    for ds, col in options:
        v = s.n(ds, col)
        if v is not None and v > 0:
            return ds, col, v
    return None


# --------------------------------------------------------------------------- fields

def f_distribution(s, wd, countries):
    f = Fact("distribution")
    cls = s.sp["class"]
    areas = [lookup(FAO_AREAS, a) for a in (s.get("fishbase", "fao_native") or [])]
    areas = [a for a in areas if a]
    if areas:
        more = len(areas) - 6
        es = [a[0] for a in areas[:6]] + ([f"{more} más"] if more > 0 else [])
        en = [a[1] for a in areas[:6]] + ([f"{more} more"] if more > 0 else [])
        f.add(s, "fishbase", cap(join(es, "es")), cap(join(en, "en")))
        f.note = {"es": "Áreas de pesca de la FAO donde es nativa.", "en": "FAO fishing areas where it is native."}
        return f.done()
    if cls == "Mammalia" and s.get("mdd", "continentDistribution"):
        cs = [c.strip().rstrip("?") for c in str(s.get("mdd", "countryDistribution") or "").split("|") if c.strip()]
        if 0 < len(cs) <= 4 and all(c in countries for c in cs):
            f.add(s, "mdd", join([countries[c] for c in cs], "es"), join(cs, "en"))
        else:
            conts = [c.strip().rstrip("?") for c in str(s.get("mdd", "continentDistribution")).split("|") if c.strip()]
            if all(c in CONTINENTS for c in conts):
                f.add(s, "mdd", join([CONTINENTS[c][0] for c in conts], "es"), join([CONTINENTS[c][1] for c in conts], "en"))
        if f.es:
            return f.done()
    if wd:
        endemic = [v for v in wd.get("P183", []) if v.get("es") and v.get("en")]
        rng = [v for v in wd.get("P9714", []) if v.get("es") and v.get("en")]
        if endemic:
            f.add(s, "wikidata", "Endémica de " + join([v["es"] for v in endemic], "es"),
                  "Endemic to " + join([v["en"] for v in endemic], "en"))
        elif rng:
            more = len(rng) > 6
            es = join([v["es"] for v in rng[:6]], "es") if not more else ", ".join(v["es"] for v in rng[:6]) + "…"
            en = join([v["en"] for v in rng[:6]], "en") if not more else ", ".join(v["en"] for v in rng[:6]) + "…"
            f.add(s, "wikidata", cap(es), cap(en))
        f.use(s, "wikidata")
    return f.done()


def flags(s, ds, table):
    return [table[c] for c in table if s.n(ds, c) == 1]


def f_habitat(s, wd):
    f = Fact("habitat")
    cls = s.sp["class"]
    if "fishbase" in s.rows:
        zone = lookup(FISH_ZONE, s.get("fishbase", "DemersPelag")) if s.get("fishbase", "DemersPelag") else None
        water = [FISH_WATER[k] for k, col in (("freshwater", "Fresh"), ("brackish", "Brack"), ("marine", "Saltwater"))
                 if s.n("fishbase", col) in (1, -1)]
        lo, hi = s.n("fishbase", "DepthRangeShallow"), s.n("fishbase", "DepthRangeDeep")
        es, en = [], []
        if zone:
            es.append(cap(zone[0])); en.append(cap(zone[1]))
        if water:
            es.append(join([w[0] for w in water], "es")); en.append(join([w[1] for w in water], "en"))
        if hi:
            es.append(f"{fmt(lo or 0, 'es')}–{fmt(hi, 'es')} m de profundidad"); en.append(f"{fmt(lo or 0, 'en')}–{fmt(hi, 'en')} m deep")
        if es:
            f.add(s, "fishbase", cap("; ".join(es)), cap("; ".join(en)))
            return f.done()
    if cls == "Aves" and s.get("avonet", "Habitat") in AVONET_HABITAT:
        es, en = AVONET_HABITAT[s.get("avonet", "Habitat")]
        f.add(s, "avonet", es, en)
    elif cls == "Mammalia" and "combine" in s.rows:
        got = flags(s, "combine", {"terrestrial_non-volant": ("terrestre", "terrestrial"),
                                   "terrestrial_volant": ("aéreo (vuela)", "aerial (flies)"),
                                   "freshwater": ("agua dulce", "freshwater"), "marine": ("marino", "marine")})
        if got:
            f.add(s, "combine", cap(join([g[0] for g in got], "es")), cap(join([g[1] for g in got], "en")))
    elif cls == "Amphibia" and "amphibio" in s.rows:
        got = flags(s, "amphibio", AMPHIBIO_HABITAT)
        if got:
            f.add(s, "amphibio", cap(join([g[0] for g in got], "es")), cap(join([g[1] for g in got], "en")))
    elif cls == "Reptilia":
        for ds, col in [("repttraits", "Microhabitat"), ("squambase", "substrate")]:
            t = translate_tokens(s.get(ds, col), REPT_HABITAT)
            if t:
                f.add(s, ds, cap(join(t[0], "es")), cap(join(t[1], "en")))
                break
    if not f.es and wd:
        vals = [v for v in wd.get("P2974", []) if v.get("es") and v.get("en")]
        if vals:
            f.add(s, "wikidata", cap(join([v["es"] for v in vals[:4]], "es")), cap(join([v["en"] for v in vals[:4]], "en")))
    return f.done()


def f_diet(s, wd):
    f = Fact("diet")
    cls = s.sp["class"]
    feed = lookup(FISH_FEEDING, s.get("fishbase", "FeedingType")) if s.get("fishbase", "FeedingType") else None
    kind = lookup(FISH_DIET, s.get("fishbase", "Herbivory2")) if s.get("fishbase", "Herbivory2") else None
    if feed or kind:
        parts = [p for p in (feed, kind) if p]
        f.add(s, "fishbase", cap("; ".join(p[0] for p in parts)), cap("; ".join(p[1] for p in parts)))
        return f.done()
    elton = {"Mammalia": "elton_mammals", "Aves": "elton_birds"}.get(cls)
    if elton and elton in s.rows:
        parts = sorted(((s.n(elton, c) or 0, c) for c in ELTON_DIET), key=lambda p: (-p[0], p[1]))
        parts = [(p, c) for p, c in parts if p >= 10]
        if parts:
            f.add(s, elton, cap(", ".join(f"{ELTON_DIET[c][0]} {fmt(p, 'es')} %" for p, c in parts)),
                  cap(", ".join(f"{ELTON_DIET[c][1]} {fmt(p, 'en')}%" for p, c in parts)))
    elif cls == "Amphibia" and "amphibio" in s.rows:
        got = flags(s, "amphibio", AMPHIBIO_DIET)
        if got:
            f.add(s, "amphibio", cap(join([g[0] for g in got], "es")), cap(join([g[1] for g in got], "en")))
    elif cls == "Reptilia":
        for ds in ("repttraits", "squambase"):
            t = translate_tokens(s.get(ds, "Diet"), REPT_DIET)
            if t:
                f.add(s, ds, cap(join(t[0], "es")), cap(join(t[1], "en")))
                break
    if not f.es and wd:
        vals = [v for v in wd.get("P1034", []) if v.get("es") and v.get("en")]
        if vals:
            f.add(s, "wikidata", "Se alimenta de " + join([v["es"] for v in vals[:5]], "es"),
                  "Feeds on " + join([v["en"] for v in vals[:5]], "en"))
    return f.done()


def sexed(s, ds, male_col, female_col):
    m, fe = s.n(ds, male_col), s.n(ds, female_col)
    return (m, fe) if m and fe and m > 0 and fe > 0 else None


def f_mass(s):
    f = Fact("mass")
    w, wf = s.n("fishbase", "Weight"), s.n("fishbase", "WeightFemale")
    if w or wf:
        es = [f"Peso máximo registrado: {mass(w, 'es')}"] if w else []
        en = [f"Maximum recorded weight: {mass(w, 'en')}"] if w else []
        if wf:
            es.append(f"♀ {mass(wf, 'es')}"); en.append(f"♀ {mass(wf, 'en')}")
        f.add(s, "fishbase", " · ".join(es), " · ".join(en))
        return f.done()
    pair = sexed(s, "amniote_lhd", "male_body_mass_g", "female_body_mass_g")
    if pair:
        f.add(s, "amniote_lhd", f"♂ {mass(pair[0], 'es')} · ♀ {mass(pair[1], 'es')}",
              f"♂ {mass(pair[0], 'en')} · ♀ {mass(pair[1], 'en')}")
        return f.done()
    cls = s.sp["class"]
    mean = {"Mammalia": [("amniote_lhd", "adult_body_mass_g"), ("pantheria", "5-1_AdultBodyMass_g"),
                         ("combine", "adult_mass_g"), ("elton_mammals", "BodyMass-Value")],
            "Aves": [("amniote_lhd", "adult_body_mass_g"), ("avonet", "Mass"), ("elton_birds", "BodyMass-Value")],
            "Reptilia": [("amniote_lhd", "adult_body_mass_g"), ("squambase", "mean female mass (g)")],
            "Amphibia": [("amphibio", "Body_mass_g")]}.get(cls, [("anage", "Adult weight (g)")])
    hit = first(s, mean)
    if hit:
        ds, col, v = hit
        if col.startswith("mean female"):
            f.add(s, ds, f"♀ {mass(v, 'es')} (media)", f"♀ {mass(v, 'en')} (mean)")
        else:
            f.add(s, ds, f"Adulto: {mass(v, 'es')}", f"Adult: {mass(v, 'en')}")
        return f.done()
    hit = first(s, [("repttraits", "Maximum body mass (g)")])
    if hit:
        f.add(s, hit[0], f"Hasta {mass(hit[2], 'es')}", f"Up to {mass(hit[2], 'en')}")
    return f.done()


def length_label(sp):
    if sp["class"] == "Mammalia":
        return "Cabeza-cuerpo", "Head–body"
    if sp["order"] == "Chelonia":
        return "Caparazón", "Carapace"
    if sp["class"] in ("Reptilia", "Amphibia"):
        return "Hocico-cloaca", "Snout–vent"
    return "Longitud", "Length"


def f_length(s):
    f = Fact("length")
    les, len_ = length_label(s.sp)
    lm, lf = s.n("fishbase", "Length"), s.n("fishbase", "LengthFemale")
    if lm or lf:
        def kind(col):
            return lookup(FISH_LENGTH, s.get("fishbase", col) or "NG") or FISH_LENGTH["NG"]
        es, en = [], []
        if lm:
            k = kind("LTypeMaxM")
            es.append(f"Máximo ({k[0]}): {length(lm * 10, 'es')}"); en.append(f"Maximum ({k[1]}): {length(lm * 10, 'en')}")
        if lf:
            k = kind("LTypeMaxF")
            es.append(f"♀ ({k[0]}): {length(lf * 10, 'es')}"); en.append(f"♀ ({k[1]}): {length(lf * 10, 'en')}")
        f.add(s, "fishbase", " · ".join(es), " · ".join(en))
        if lm and lf:
            f.note = {"es": "El primer valor es de machos o de ejemplares sin sexar.", "en": "The first value is for males or unsexed fish."}
        return f.done()
    pair = sexed(s, "amniote_lhd", "male_svl_cm", "female_svl_cm")
    if pair:
        f.add(s, "amniote_lhd", f"{les} ♂ {length(pair[0] * 10, 'es')} · ♀ {length(pair[1] * 10, 'es')}",
              f"{len_} ♂ {length(pair[0] * 10, 'en')} · ♀ {length(pair[1] * 10, 'en')}")
        return f.done()
    sv = "straight carapace length for turtles (\"SCL\", mm)"
    pair = sexed(s, "repttraits", f'Maximum male length ("SVL", mm)/{sv}', f'Maximum female length ("SVL", mm)/{sv}')
    if pair:
        f.add(s, "repttraits", f"{les}, máximo: ♂ {length(pair[0], 'es')} · ♀ {length(pair[1], 'es')}",
              f"{len_}, maximum: ♂ {length(pair[0], 'en')} · ♀ {length(pair[1], 'en')}")
        return f.done()
    hit = first(s, [("amniote_lhd", "adult_svl_cm"), ("amniote_lhd", "no_sex_svl_cm")])
    if hit:
        f.add(s, hit[0], f"{les}: {length(hit[2] * 10, 'es')}", f"{len_}: {length(hit[2] * 10, 'en')}")
        return f.done()
    hit = first(s, [("pantheria", "13-1_AdultHeadBodyLen_mm"), ("combine", "adult_body_length_mm")])
    if hit:
        f.add(s, hit[0], f"Cabeza-cuerpo: {length(hit[2], 'es')}", f"Head–body: {length(hit[2], 'en')}")
        return f.done()
    hit = first(s, [("repttraits", 'Maximum total length ("TL", mm)'), ("squambase", "maximum total length (mm)")])
    if hit:
        f.add(s, hit[0], f"Longitud total: hasta {length(hit[2], 'es')}", f"Total length: up to {length(hit[2], 'en')}")
        return f.done()
    hit = first(s, [("repttraits", f'Maximum length ("SVL", mm)/{sv}'), ("squambase", "maximum SVL (mm)")])
    if hit:
        f.add(s, hit[0], f"{les}: hasta {length(hit[2], 'es')}", f"{len_}: up to {length(hit[2], 'en')}")
        return f.done()
    hit = first(s, [("amphibio", "Body_size_mm")])
    if hit:
        f.add(s, hit[0], f"Tamaño máximo: {length(hit[2], 'es')}", f"Maximum size: {length(hit[2], 'en')}")
    return f.done()


def f_dimorphism(s):
    """Size dimorphism from a dataset's male/female means; otherwise Animal Diversity Web's categories."""
    return f_dimorphism_size(s) or f_dimorphism_adw(s)


def f_dimorphism_adw(s):
    kws = [lookup(ADW_DIMORPHISM, k) for k in (s.get("adw", "dimorphism") or [])]
    kws = [k for k in kws if k]
    if not kws:
        return None
    f = Fact("dimorphism")
    alike = kws == [ADW_DIMORPHISM["sexes alike"]]
    f.add(s, "adw", ("No: " if alike else "Sí: ") + join([k[0] for k in kws], "es"),
          ("No: " if alike else "Yes: ") + join([k[1] for k in kws], "en"))
    return f.done()


def f_dimorphism_size(s):
    """Size dimorphism from a dataset's male/female means. Silent when the ratio is ambiguous."""
    sv = "straight carapace length for turtles (\"SCL\", mm)"
    for ds, mcol, fcol, kind, yes, no, scale in [
            ("amniote_lhd", "male_body_mass_g", "female_body_mass_g", "mass", 1.20, 1.10, mass),
            ("amniote_lhd", "male_svl_cm", "female_svl_cm", "length", 1.07, 1.03, lambda v, l: length(v * 10, l)),
            ("repttraits", f'Maximum male length ("SVL", mm)/{sv}', f'Maximum female length ("SVL", mm)/{sv}',
             "length", 1.07, 1.03, length)]:
        pair = sexed(s, ds, mcol, fcol)
        if not pair:
            continue
        m, fe = pair
        ratio = max(m, fe) / min(m, fe)
        numbers = {lang: f"♂ {scale(m, lang)}; ♀ {scale(fe, lang)}" for lang in ("es", "en")}
        f = Fact("dimorphism")
        pct = round((ratio - 1) * 100)
        if ratio >= yes:
            bigger_es = "los machos" if m > fe else "las hembras"
            bigger_en = "males" if m > fe else "females"
            verb_es, verb_en = ("pesan", "are") if kind == "mass" else ("miden", "are")
            what_en = "heavier" if kind == "mass" else "longer"
            f.add(s, ds, f"Sí, de tamaño: {bigger_es} {verb_es} un {pct} % más ({numbers['es']})",
                  f"Yes, in size: {bigger_en} {verb_en} {pct}% {what_en} ({numbers['en']})")
        elif ratio <= no:
            f.add(s, ds, f"No en tamaño: machos y hembras son similares ({numbers['es']})",
                  f"Not in size: males and females are similar ({numbers['en']})")
        else:
            return None
        f.note = {
            "es": f"Solo tamaño, a partir de {'la masa media' if kind == 'mass' else 'la longitud'} de machos y hembras "
                  "del conjunto de datos; no se valoran diferencias de color ni de forma.",
            "en": f"Size only, from the dataset's male and female {'mean mass' if kind == 'mass' else 'length'}; "
                  "colour or shape differences are not assessed here.",
        }
        return f.done()
    return None


def f_sex_determination(s):
    f = Fact("sex_determination")
    tos = [s.get("tos", c) for c in ("Karyotype (ZO,ZW,XY,XO,WO,homomorphic,complex XY,complex ZW)",
                                     "Genotypic (male heterogametic,female heterogametic,GSD,polygenic)",
                                     "Environmental (TSD,TSD Ia,TSD Ib,TSD II,size,density,pH,ESD_other)",
                                     "Sexual system (hermaphrodite,monoecy,dioecy,gynodioecy,androdioecy,gynomonoecy,andromonoecy,polygamodioecy,polygamomonoecy,apomictic,other)")]
    for ds, value in (("tos", " | ".join(str(v) for v in tos if v)),
                      ("repttraits", s.get("repttraits", "Sex-determining mechanism (GSD or TSD)"))):
        t = translate_tokens(value, SEXDET)
        if t:
            def head(parts):
                if len(parts) == 1:
                    return parts[0]
                return "; ".join(parts) if "(" in parts[0] else f"{parts[0]} ({', '.join(parts[1:])})"
            f.add(s, ds, cap(head(t[0])), cap(head(t[1])))
            return f.done()
    cls, order = s.sp["class"], s.sp["order"]
    if cls == "Mammalia" and order == "Monotremata":
        f.add(s, "sexdet_rule", "XY múltiple (varios cromosomas X e Y)", "Multiple XY (several X and Y chromosomes)")
        f.note = "rule: monotremes have multiple X and Y sex chromosomes (platypus 5 X and 5 Y)"
    elif cls == "Mammalia":
        f.add(s, "sexdet_rule", "XY (macho heterogamético)", "XY (male heterogametic)")
        f.note = {"es": "regla: los mamíferos son XY", "en": "rule: mammals are XY"}
    elif cls == "Aves":
        f.add(s, "sexdet_rule", "ZW (hembra heterogamética)", "ZW (female heterogametic)")
        f.note = {"es": "regla: las aves son ZW", "en": "rule: birds are ZW"}
    else:
        return None
    f.matches.append("rule")
    return f.done()


def f_lifespan(s):
    f = Fact("lifespan")
    hit = first(s, [("anage", "Maximum longevity (yrs)"), ("amniote_lhd", "maximum_longevity_y"),
                    ("repttraits", "Maximum Longevity (years)"), ("amphibio", "Longevity_max_y"),
                    ("squambase", "Maximum Longevity (years)")])
    if hit:
        ds, _, v = hit
        origin = str(s.get("anage", "Specimen origin") or "") if ds == "anage" else ""
        where = {"captivity": (" (en cautividad)", " (in captivity)"), "wild": (" (en libertad)", " (in the wild)")}.get(origin, ("", ""))
        f.add(s, ds, f"Longevidad máxima registrada: {years(v, 'es')}{where[0]}",
              f"Maximum recorded lifespan: {years(v, 'en')}{where[1]}")
        return f.done()
    hit = first(s, [("pantheria", "17-1_MaxLongevity_m"), ("combine", "max_longevity_d")])
    if hit:
        ds, col, v = hit
        y = v / 12 if col.endswith("_m") else v / 365.25
        f.add(s, ds, f"Longevidad máxima registrada: {years(y, 'es')}", f"Maximum recorded lifespan: {years(y, 'en')}")
        return f.done()
    v = s.n("fishbase", "LongevityWild")
    if v:
        f.add(s, "fishbase", f"Longevidad máxima en libertad: {years(v, 'es')}", f"Maximum lifespan in the wild: {years(v, 'en')}")
    return f.done()


def f_reproduction(s):
    f = Fact("reproduction")
    cls = s.sp["class"]
    mode = None
    if cls == "Reptilia":
        for ds, col in [("repttraits", "Reproductive mode"), ("squambase", "Mode of reproduction")]:
            t = translate_tokens(s.get(ds, col), REPT_REPRO)
            if t:
                mode = (ds, cap(join(t[0], "es")), cap(join(t[1], "en")))
                break
    elif cls == "Amphibia" and "amphibio" in s.rows:
        got = flags(s, "amphibio", {"Dir": ("desarrollo directo", "direct development"),
                                    "Lar": ("con fase larvaria", "with a larval stage"),
                                    "Viv": ("vivíparo", "viviparous")})
        if got:
            mode = ("amphibio", cap(join([g[0] for g in got], "es")), cap(join([g[1] for g in got], "en")))
    if mode:
        f.add(s, mode[0], mode[1], mode[2])
    mammal = cls == "Mammalia"
    hit = first(s, [("anage", "Gestation/Incubation (days)"),
                    ("amniote_lhd", "gestation_d" if mammal else "incubation_d"),
                    ("pantheria", "9-1_GestationLen_d"), ("combine", "gestation_length_d")])
    if hit:
        es, en = ("Gestación", "Gestation") if mammal else ("Incubación", "Incubation")
        f.add(s, hit[0], f"{es}: {days(hit[2], 'es')}", f"{en}: {days(hit[2], 'en')}")
    lo, hi = s.n("amphibio", "Litter_size_min_n"), s.n("amphibio", "Litter_size_max_n")
    if lo and hi and hi > lo:
        f.add(s, "amphibio", f"Puesta: {fmt(lo, 'es')}–{fmt(hi, 'es')} huevos", f"Clutch: {fmt(lo, 'en')}–{fmt(hi, 'en')} eggs")
    else:
        hit = first(s, [("anage", "Litter/Clutch size"), ("amniote_lhd", "litter_or_clutch_size_n"),
                        ("pantheria", "15-1_LitterSize"), ("combine", "litter_size_n"),
                        ("repttraits", "Mean number of offspring per litter or number of eggs per clutch"),
                        ("amphibio", "Litter_size_max_n")])
        if hit:
            v = hit[2]
            if mammal:
                f.add(s, hit[0], f"Crías por parto: {fmt(v, 'es', 2)}", f"Young per litter: {fmt(v, 'en', 2)}")
            else:
                f.add(s, hit[0], f"Huevos o crías por puesta: {fmt(v, 'es', 2)}", f"Eggs or young per clutch: {fmt(v, 'en', 2)}")
    hit = first(s, [("anage", "Female maturity (days)"), ("amniote_lhd", "female_maturity_d"), ("combine", "female_maturity_d")])
    if hit:
        f.add(s, hit[0], f"Madurez de la hembra: {age(hit[2], 'es')}", f"Female maturity: {age(hit[2], 'en')}")
    elif s.n("amphibio", "Age_at_maturity_min_y"):
        v = s.n("amphibio", "Age_at_maturity_min_y")
        f.add(s, "amphibio", f"Madurez: desde {years(v, 'es')}", f"Maturity: from {years(v, 'en')}")
    return f.done()


def f_activity(s):
    f = Fact("activity")
    cls = s.sp["class"]
    got = []
    if cls == "Mammalia" and "elton_mammals" in s.rows:
        got = [k for k, c in (("nocturnal", "Activity-Nocturnal"), ("crepuscular", "Activity-Crepuscular"),
                              ("diurnal", "Activity-Diurnal")) if s.n("elton_mammals", c) == 1]
        ds = "elton_mammals"
    elif cls == "Aves" and s.n("elton_birds", "Nocturnal") is not None:
        got, ds = ["nocturnal" if s.n("elton_birds", "Nocturnal") == 1 else "diurnal"], "elton_birds"
    elif cls == "Amphibia" and "amphibio" in s.rows:
        got = [k for k, c in (("nocturnal", "Noc"), ("crepuscular", "Crepu"), ("diurnal", "Diu")) if s.n("amphibio", c) == 1]
        ds = "amphibio"
    elif cls == "Reptilia":
        for ds, col in [("repttraits", "Active time"), ("squambase", "Activity time")]:
            t = translate_tokens(s.get(ds, col), {k: v for k, v in ACTIVITY.items()})
            if t:
                f.add(s, ds, cap(join(t[0], "es")), cap(join(t[1], "en")))
                return f.done()
    if got:
        f.add(s, ds, cap(join([ACTIVITY[k][0] for k in got], "es")), cap(join([ACTIVITY[k][1] for k in got], "en")))
    return f.done()


def f_migration(s):
    f = Fact("migration")
    v = s.n("avonet", "Migration")
    if v in MIGRATION:
        f.add(s, "avonet", *MIGRATION[v])
    elif s.get("fishbase", "AnaCat"):
        t = lookup(FISH_MIGRATION, s.get("fishbase", "AnaCat"))
        if t:
            f.add(s, "fishbase", *t)
    return f.done()


def f_iucn(s, gbif, wd):
    f = Fact("iucn")
    code = (gbif.get("iucn") or {}).get("code")
    if code in IUCN:
        f.add(s, "gbif_iucn", f"{IUCN[code][0]} ({code})", f"{IUCN[code][1]} ({code})")
        return f.done()
    labels = {v[1]: k for k, v in IUCN.items()}
    for v in (wd or {}).get("P141", []):
        k = labels.get(cap(v.get("en") or ""))
        if k:
            f.add(s, "wikidata", f"{IUCN[k][0]} ({k})", f"{IUCN[k][1]} ({k})")
            return f.done()
    return None


SPAIN = {"LESRPE": ("Incluida en el Listado de Especies Silvestres en Régimen de Protección Especial (LESRPE)",
                    "Listed in the Spanish List of Wild Species under Special Protection (LESRPE)"),
         "Vulnerable": ("Catálogo Español de Especies Amenazadas: Vulnerable", "Spanish Catalogue of Threatened Species: Vulnerable"),
         "En peligro de extinción": ("Catálogo Español de Especies Amenazadas: En peligro de extinción",
                                     "Spanish Catalogue of Threatened Species: Endangered")}


def f_spain(s, entries):
    f = Fact("spain")
    if entries:
        parts_es, parts_en = [], []
        for e in entries:
            if e["status"] not in SPAIN:
                continue
            es, en = SPAIN[e["status"]]
            pop = e.get("population")
            if pop and pop not in ("LESRPE",) and "toda" not in pop.lower():
                es, en = f"{es} (población: {pop})", f"{en} (population: {pop})"
            if e.get("listed_as"):
                es, en = f"{es}, como toda la familia {e['listed_as']}", f"{en}, as part of the whole family {e['listed_as']}"
            if es not in parts_es:
                parts_es.append(es)
                parts_en.append(en)
        f.es, f.en = parts_es, parts_en
        f.src.append("miteco")
    else:
        f.es, f.en, f.src = ["No incluida en el LESRPE ni en el CEEA"], ["Not in the LESRPE or the CEEA"], ["miteco"]
    f.matches.append("exact")
    f.note = {"es": "Tabla del MITECO de 30-06-2025, anterior a la Orden TED/1096/2026.", "en": "MITECO table of 30-06-2025; it predates Orden TED/1096/2026."}
    return f.done(sep="; ")


def species_facts(sp, snap, classify):
    """All facts for one species, plus the parent-of-split matches that were dropped."""
    s = Species(sp, snap["traits"], classify)
    b = sp["binomial"]
    wd = snap["wikidata"].get(b)
    gbif = snap["names"].get(b) or {}
    out = [f_distribution(s, wd, snap["countries"]), f_habitat(s, wd), f_diet(s, wd), f_mass(s), f_length(s),
           f_dimorphism(s), f_sex_determination(s), f_lifespan(s), f_reproduction(s), f_activity(s),
           f_migration(s), f_iucn(s, gbif, wd), f_spain(s, snap["miteco"].get(b))]
    return [f for f in out if f], s.dropped
