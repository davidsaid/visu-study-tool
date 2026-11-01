"""FishBase rows for the listed fishes, from the rfishbase Parquet snapshot on Hugging Face.

refresh.py downloads the tables into .cache/datasets/fishbase/<version>/ and calls extract(); the
result goes into snapshot/traits.json as the "fishbase" dataset, in the same {name, via, v} shape
as the other datasets, so build.py's synonym rules apply to it too.

Licence: CC BY-NC 4.0 (https://www.fishbase.se/summary/citation.php). Every fact links the
species' own FishBase page (source key "fishbase:<SpecCode>").
Traps (research note 2026-11-01): `Length` is the male or unsexed maximum, with its own length
type (TL, SL, FL, WD); the modelled `estimate` table is not used.
"""
from collections import defaultdict

VERSION = "v25.04"
BASE = f"https://huggingface.co/datasets/cboettig/fishbase/resolve/main/data/fb/{VERSION}/parquet/"
TABLES = ["species", "synonyms", "ecology", "faoareas", "faoarref"]
FISH_CLASSES = {"Actinopterygii", "Chondrichthyes", "Sarcopterygii", "Hyperoartia", "Myxini"}
SPECIES_COLS = ["SpecCode", "Genus", "Species", "Length", "LTypeMaxM", "LengthFemale", "LTypeMaxF", "Weight",
                "WeightFemale", "LongevityWild", "DemersPelag", "Fresh", "Brack", "Saltwater", "AnaCat",
                "DepthRangeShallow", "DepthRangeDeep"]


def ok(v):
    return v is not None and v != "" and not (isinstance(v, float) and v != v) and not (isinstance(v, str) and not v.strip())


def clean(v):
    """Undo float32 noise from the Parquet export (80.4000015 -> 80.4)."""
    return float(f"{v:.6g}") if isinstance(v, float) else (v.strip() if isinstance(v, str) else v)


def extract(species, folder):
    """{binomial: {"name", "via", "v"}} for the listed fishes found in FishBase (exact name, or one
    unambiguous synonym)."""
    import pyarrow.parquet as pq

    def rows(table, cols=None):
        return pq.read_table(f"{folder}/{table}.parquet", columns=cols).to_pylist()

    sp = rows("species", SPECIES_COLS)
    by_name = {f"{r['Genus']} {r['Species']}": r for r in sp}
    by_code = {r["SpecCode"]: r for r in sp}
    syn = defaultdict(set)
    for r in rows("synonyms", ["SpecCode", "SynGenus", "SynSpecies", "Status", "TaxonLevel"]):
        if r["TaxonLevel"] == "Species" and r["Status"] in ("synonym", "ambiguous synonym", "accepted name"):
            syn[f"{(r['SynGenus'] or '').strip()} {(r['SynSpecies'] or '').strip()}"].add(r["SpecCode"])
    eco = {}
    for r in rows("ecology", ["SpecCode", "FeedingType", "Herbivory2"]):
        eco.setdefault(r["SpecCode"], r)
    fao_name = {r["AreaCode"]: r["FAO"] for r in rows("faoarref", ["AreaCode", "FAO"])}
    fao = defaultdict(set)
    for r in rows("faoareas", ["SpecCode", "AreaCode", "Status"]):
        if (r["Status"] or "").strip().lower() in ("native", "endemic") and r["AreaCode"] in fao_name:
            fao[r["SpecCode"]].add(fao_name[r["AreaCode"]])

    out = {}
    for s in species:
        if s["class"] not in FISH_CLASSES:
            continue
        b = s["binomial"]
        rec, via = by_name.get(b), "exact"
        if not rec and len(syn.get(b, ())) == 1:
            rec, via = by_code.get(next(iter(syn[b]))), "synonym"
        if not rec:
            continue
        code = rec["SpecCode"]
        v = {k: clean(rec[k]) for k in SPECIES_COLS if ok(rec[k])}
        e = eco.get(code) or {}
        v.update({k: clean(e[k]) for k in ("FeedingType", "Herbivory2") if ok(e.get(k))})
        if fao.get(code):
            v["fao_native"] = sorted(fao[code])
        out[b] = {"name": f"{rec['Genus']} {rec['Species']}", "via": via, "v": v}
    return out
