"""Build the app's data files from committed inputs only (no network, deterministic).

    .venv/bin/python pipeline/build.py

Inputs:  collections/<id>/*.csv, curation/*.csv, pipeline/snapshot/*.json, content/**/*.json
Outputs: data/collections.js, and per collection data/<id>/bestiary.js, content.js and media.js
         (via pipeline/media.py, if present); CREDITS.md and reports/build-report.md

The contract for the outputs is docs/data-format.md. The build stops with a non-zero exit
and a message naming the file, row and column on any error in the CSVs.
"""
import hashlib
import importlib.util
import json
import sys
from collections import Counter, OrderedDict

import facts as F
import vocab
from common import (COLLECTIONS, CURATION, ROOT, SNAPSHOT, BuildError, check_url, load_collections, load_json,
                    read_csv, rel, write_all)
from sources import SOURCES

CONTENT = ROOT / "content"
NODE_KINDS = ("deep", "clade", "class", "order", "infraorder", "grade")
CONFIDENCE = ("certain", "suggested", "contested")
STATUS = ("pending", "accepted", "rejected")
VIDEO_STATUS = {"ok": "ok", "link_only": "link_only", "broken": "broken", "unknown": "link_only"}


class Warnings(list):
    def add(self, msg):
        if msg not in self:
            self.append(msg)


# --------------------------------------------------------------------------- inputs

def load_snapshot(folder=SNAPSHOT):
    return {name: load_json(folder / f"{name}.json") for name in
            ("meta", "names", "traits", "wikidata", "countries", "inaturalist", "links", "miteco")}


def load_synonym_verdicts():
    rows = read_csv(CURATION / "synonyms.csv", ["binomial", "synonym", "verdict"])
    bad = [r for r in rows if r["verdict"] not in ("same_taxon", "parent_of_split")]
    if bad:
        raise BuildError(f"curation/synonyms.csv row {bad[0]['_line']}: verdict must be same_taxon or parent_of_split")
    return {(r["binomial"], r["synonym"]): r["verdict"] for r in rows}


def make_classifier(verdicts, binomials):
    """How a dataset row was matched: exact, synonym (same taxon) or parent_of_split.

    A name reached through a trinomial (Bufo bufo spinosus -> Bufo bufo), or a binomial with a
    different epithet (Lama guanicoe -> Lama glama), describes a different species concept and
    is treated as parent_of_split unless curation/synonyms.csv says otherwise. A genus change
    with the same epithet (Macropus rufus -> Osphranter rufus) is the same taxon.
    """
    def classify(binomial, hit):
        if hit["via"] == "exact":
            return "exact"
        name = hit["name"]
        if (binomial, name) in verdicts:
            return "synonym" if verdicts[(binomial, name)] == "same_taxon" else "parent_of_split"
        if name in binomials or hit["via"] == "trinomial":
            return "parent_of_split"
        return "synonym" if name.split()[1] == binomial.split()[1] else "parent_of_split"
    return classify


def load_corrections(ids, warnings):
    cols = ["species_id", "field", "bestiary_value", "suggested_value", "confidence", "source_url",
            "note_es", "note_en", "status"]
    rows = read_csv(CURATION / "corrections.csv", cols)
    out = []
    for r in rows:
        where = f"curation/corrections.csv row {r['_line']}"
        if r["confidence"] not in CONFIDENCE:
            raise BuildError(f"{where}: confidence '{r['confidence']}' must be one of {CONFIDENCE}")
        if r["status"] not in STATUS:
            raise BuildError(f"{where}: status '{r['status']}' must be one of {STATUS}")
        if not r["field"]:
            raise BuildError(f"{where}: field is empty")
        check_url(r["source_url"], f"{where}, source_url")
        if r["species_id"] and r["species_id"] not in ids:
            warnings.add(f"{where}: species '{r['species_id']}' is in no collection; row ignored")
            continue
        out.append(r)
    return out


def correction(r):
    return {"species_id": r["species_id"] or None, "field": r["field"], "bestiary_value": r["bestiary_value"],
            "suggested_value": r["suggested_value"] or None, "confidence": r["confidence"],
            "source_url": r["source_url"] or None, "note": {"es": r["note_es"], "en": r["note_en"]}}


# --------------------------------------------------------------------------- tree

def read_clades():
    return read_csv(CURATION / "clades.csv", ["node_id", "parent_id", "scientific", "name_es", "name_en", "source_url"])


def build_tree(species, warnings, rows, root_name=None):
    """The collection's tree from the shared clades.csv. Rows for groups that aren't in this collection
    are left out; so is every clade that leads to none of its classes (e.g. arthropod clades in the
    vertebrate collection).

    The root is the top clade (parent empty or a deep: row) above the collection's classes. When they
    sit under several top clades (an invertebrate list spans phyla), the deepest deep: row they share
    becomes the root, and the deep: rows between it and each top clade become clades of the tree. When
    none of its classes is in clades.csv yet, the collection gets a root of its own (`root_name`), and its
    classes hang from it."""
    classes = list(OrderedDict.fromkeys(s["class"] for s in species))
    orders = OrderedDict()
    for s in species:
        if orders.setdefault(s["order"], s["class"]) != s["class"]:
            raise BuildError(f"species.csv row {s['line']}: order '{s['order']}' appears under two classes "
                             f"({orders[s['order']]} and {s['class']})")
    infraorders = OrderedDict((s["infraorder"], s["order"]) for s in species if s["infraorder"])

    deep, nodes, grades, seen, absent = {}, OrderedDict(), set(), set(), set()
    for r in rows:
        where = f"curation/clades.csv row {r['_line']}"
        nid = r["node_id"]
        kind, _, name = nid.partition(":")
        if kind not in NODE_KINDS or not name:
            raise BuildError(f"{where}: node_id '{nid}' must start with one of {NODE_KINDS} and a colon")
        if nid in seen:
            raise BuildError(f"{where}: duplicate node_id '{nid}'")
        seen.add(nid)
        if not (r["name_es"] and r["name_en"] and r["source_url"]):
            raise BuildError(f"{where}: name_es, name_en and source_url are required")
        check_url(r["source_url"], f"{where}, source_url")
        entry = {"scientific": r["scientific"] or name, "es": r["name_es"], "en": r["name_en"],
                 "source_url": r["source_url"], "parent": r["parent_id"] or None}
        if kind == "deep":
            deep[nid] = entry
        elif kind == "grade":
            grades.add(name)
        elif (kind == "class" and name not in classes) or (kind == "order" and name not in orders) or \
                (kind == "infraorder" and name not in infraorders):
            absent.add(nid)   # a group that is not in this collection
            continue
        else:
            nodes[nid] = dict(entry, kind=kind, name=name)

    # Clades that only hung from a group that isn't in the list go too, so a maintainer can remove a
    # whole class without editing clades.csv.
    orphans = [n for n, e in nodes.items() if e["parent"] in absent]
    while orphans:
        for n in orphans:
            warnings.add(f"{n} hangs from {nodes[n]['parent']}, which is not in this list; left out of the tree")
            absent.add(n)
            del nodes[n]
        orphans = [n for n, e in nodes.items() if e["parent"] in absent]

    def top(nid):
        seen_up = set()
        while nodes[nid]["parent"] in nodes:
            if nid in seen_up:
                raise BuildError(f"curation/clades.csv: cycle through '{nid}'")
            seen_up.add(nid)
            nid = nodes[nid]["parent"]
        return nid
    for nid, e in nodes.items():
        if e["parent"] is not None and e["parent"] not in nodes and e["parent"] not in deep:
            raise BuildError(f"curation/clades.csv: '{nid}' has parent '{e['parent']}', which is not a row")
    tops = {top(n) for n, e in nodes.items() if e["kind"] in ("class", "order", "infraorder")}
    roots = sorted(t for t in tops if nodes[t]["kind"] == "clade")
    if not roots:
        root = "clade:collection"
        label = root_name or {"es": "Colección", "en": "Collection"}
        nodes[root] = {"scientific": label["en"], "es": label["es"], "en": label["en"], "source_url": None,
                       "parent": None, "kind": "clade", "name": "collection"}
        warnings.add("none of this collection's classes is in curation/clades.csv; they hang from the collection's own root")
    elif len(roots) == 1:
        root = roots[0]
    else:
        def deep_chain(nid):
            out = []
            while nid:
                if nid not in deep:
                    raise BuildError(f"curation/clades.csv: '{nid}' is not a deep: row")
                if nid in out:
                    raise BuildError(f"curation/clades.csv: cycle through '{nid}'")
                out.append(nid)
                nid = deep[nid]["parent"]
            return out
        chains = {r: deep_chain(nodes[r]["parent"]) for r in roots}
        common = next((d for d in chains[roots[0]] if all(d in c for c in chains.values())), None)
        if common is None:
            raise BuildError(f"curation/clades.csv: the top clades {roots} share no deep: ancestor")
        for r in roots:
            for d in chains[r][:chains[r].index(common) + 1]:
                nodes.setdefault(d, dict(deep[d], kind="clade", name=d.partition(":")[2]))
        root = common
    # A class or order row without a parent clade keeps its names and hangs from the root.
    for t in sorted(t for t in tops if nodes[t]["kind"] != "clade"):
        warnings.add(f"{t} has no parent clade in curation/clades.csv; attached to {root}")
        nodes[t]["parent"] = root
    for nid in [n for n in nodes if top(n) != root]:
        del nodes[nid]   # another collection's part of the tree

    for cls in classes:
        if f"class:{cls}" not in nodes and cls not in grades:
            warnings.add(f"class '{cls}' has no row in curation/clades.csv; attached to {root}")
            nodes[f"class:{cls}"] = {"scientific": cls, "es": cls, "en": cls, "source_url": None, "parent": root,
                                     "kind": "class", "name": cls}
    for order, cls in orders.items():
        if f"order:{order}" not in nodes:
            parent = root if cls in grades else f"class:{cls}"
            warnings.add(f"order '{order}' has no row in curation/clades.csv; attached to {parent}")
            nodes[f"order:{order}"] = {"scientific": order, "es": order, "en": order, "source_url": None,
                                       "parent": parent, "kind": "order", "name": order}
    for infra, order in infraorders.items():
        if f"infraorder:{infra}" not in nodes:
            warnings.add(f"infraorder '{infra}' has no row in curation/clades.csv; attached to order:{order}")
            nodes[f"infraorder:{infra}"] = {"scientific": infra, "es": infra, "en": infra, "source_url": None,
                                            "parent": f"order:{order}", "kind": "infraorder", "name": infra}

    tree = OrderedDict()
    for nid, e in nodes.items():
        parent = None if nid == root else e["parent"]
        if parent is not None and parent not in nodes:
            raise BuildError(f"curation/clades.csv: '{nid}' has parent '{e['parent']}', which is not in this collection's tree")
        tree[nid] = {"id": nid, "parent": parent, "children": [], "rank": e["kind"], "scientific": e["scientific"],
                     "name": {"es": e["es"], "en": e["en"]},
                     "teacher_rank": e["kind"] if e["kind"] in ("class", "order", "infraorder") else None,
                     "grade": orders.get(e["name"]) if e["kind"] == "order" and orders.get(e["name"]) in grades else None,
                     "source_url": e["source_url"], "species_count": 0}
    for s in species:
        parent = f"infraorder:{s['infraorder']}" if s["infraorder"] else f"order:{s['order']}"
        tree[s["id"]] = {"id": s["id"], "parent": parent, "children": [], "rank": "species",
                         "scientific": s["binomial"], "name": {"es": s["common_es"], "en": s.get("common_en")},
                         "teacher_rank": None, "grade": None, "source_url": None, "species_count": 1}
    for nid, n in tree.items():
        if n["parent"]:
            tree[n["parent"]]["children"].append(nid)

    def ancestors(nid):
        out, cur = [], tree[nid]["parent"]
        while cur:
            if cur in out:
                raise BuildError(f"curation/clades.csv: cycle through '{cur}'")
            out.append(cur)
            cur = tree[cur]["parent"]
        return out

    for order, cls in orders.items():
        up = ancestors(f"order:{order}")
        if cls in grades:
            wrong = [a for a in up if tree[a]["rank"] == "class"]
            if wrong:
                raise BuildError(f"curation/clades.csv: order:{order} (grade {cls} in the list) sits under {wrong[0]}")
        elif f"class:{cls}" not in up:
            raise BuildError(f"curation/clades.csv: order:{order} must sit under class:{cls}, its class in the list")
    for infra, order in infraorders.items():
        if f"order:{order}" not in ancestors(f"infraorder:{infra}"):
            raise BuildError(f"curation/clades.csv: infraorder:{infra} must sit under order:{order}")
    for s in species:
        for a in ancestors(s["id"]):
            tree[a]["species_count"] += 1

    for nid in [n for n, v in tree.items() if v["species_count"] == 0]:
        warnings.add(f"{nid} has no species in this collection; left out of the tree")
        parent = tree[nid]["parent"]
        if parent in tree:   # its parent may be an empty branch already removed
            tree[parent]["children"].remove(nid)
        del tree[nid]

    deep_path, cur = [], nodes[root]["parent"]
    while cur:
        if cur not in deep:
            raise BuildError(f"curation/clades.csv: deep path parent '{cur}' is not a deep: row")
        if len(deep_path) > len(deep):
            raise BuildError(f"curation/clades.csv: cycle through '{cur}'")
        deep_path.append({k: deep[cur][k] for k in ("scientific", "es", "en", "source_url")})
        cur = deep[cur]["parent"]
    deep_path.reverse()
    deep_path.append({"scientific": nodes[root]["scientific"], "es": nodes[root]["es"], "en": nodes[root]["en"],
                      "source_url": nodes[root]["source_url"]})
    return {"root": root, "deep_path": deep_path, "nodes": tree}


# --------------------------------------------------------------------------- species

def common_en(wd, traits, binomial):
    label = (wd or {}).get("label_en")
    if label and label != binomial:
        return F.cap(label)
    mdd = (traits.get("mdd", {}).get(binomial) or {})
    return (mdd.get("v") or {}).get("mainCommonName") if mdd.get("via") == "exact" else None


def video(v, links, sid, report):
    """The species' video from videos.csv, with the status of the last link check of that same URL.
    A URL that wasn't checked yet gets status "unchecked" (the app still offers to load it) until the
    next refresh.py; CI runs refresh.py when the build report lists one."""
    if not v:
        return None
    credit = {"channel": v["channel"], "channel_url": v["channel_url"], "title": v["title"]}
    rec = links["links"].get(v["url"])
    if not rec:
        report["link_missing"].append(sid)
        return dict(credit, url=v["url"], status="unchecked", checked=v.get("checked"))
    if rec["status"] == "unknown":
        report["link_unknown"].append(sid)
    url = check_url(rec.get("repaired_url") or v["url"], f"pipeline/snapshot/links.json, {v['url']}")
    return dict(credit, url=url, status=VIDEO_STATUS[rec["status"]], checked=links["checked"])


def build_species(species, snap, classify, corrections, videos, report):
    accepted = [c for c in corrections if c["status"] == "accepted"]
    out = OrderedDict()
    for s in species:
        b = s["binomial"]
        g = snap["names"].get(b) or {}
        wd = snap["wikidata"].get(b)
        mdd = (snap["traits"].get("mdd", {}).get(b) or {})
        mddv = mdd.get("v", {}) if mdd.get("via") == "exact" else {}
        authority = g.get("authorship")
        if not authority and mddv.get("authoritySpeciesAuthor"):
            a = f"{mddv['authoritySpeciesAuthor']}, {mddv.get('authoritySpeciesYear', '')}".strip(", ")
            authority = f"({a})" if str(mddv.get("authorityParentheses")) == "1" else a
        family = g.get("family") or (str(mddv["family"]).title() if mddv.get("family") else None)
        keys = {k: v for k, v in (("gbif", g.get("usageKey") if g.get("rank") == "SPECIES" else None),
                                  ("wikidata", (wd or {}).get("qid")),
                                  ("inat", snap["inaturalist"].get(b))) if v}
        fact_list, dropped = F.species_facts(s, snap, classify)
        for d in dropped:
            report["dropped"].append((s["id"], d))
        s["common_en"] = common_en(wd, snap["traits"], b)
        out[s["id"]] = {
            "id": s["id"], "binomial": b, "genus": s["genus"], "epithet": s["epithet"],
            "class": s["class"], "order": s["order"], "infraorder": s["infraorder"],
            "common_es": s["common_es"], "common_en": s["common_en"], "family": family, "authority": authority,
            "keys": keys, "video": video(videos.get(s["id"]), snap["links"], s["id"], report), "facts": fact_list,
            "corrections": [correction(c) for c in accepted if c["species_id"] == s["id"]],
        }
    return out


# --------------------------------------------------------------------------- content and media

def compile_content(tree, warnings, registry, report, used_ids, classes=()):
    """The content files of this collection's tree nodes, plus those of the list's classes that are not tree
    nodes (the grade Reptilia), whose etymology the cards show. used_ids collects every id used by some
    collection, so files that belong to none can be reported once."""
    extra = {f"class:{c}" for c in classes}
    content = {"species": OrderedDict(), "groups": OrderedDict()}
    for kind, folder in (("species", CONTENT / "species"), ("groups", CONTENT / "groups")):
        for path in sorted(folder.glob("*.json")) if folder.exists() else []:
            try:
                obj = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                raise BuildError(f"{path.relative_to(ROOT)}: invalid JSON: {e}")
            nid = path.stem if kind == "species" else path.stem.replace("__", ":", 1)
            if nid not in tree["nodes"] and nid not in extra:
                continue
            used_ids.add(f"content/{kind}/{path.name}")
            content[kind][nid] = obj
            for src in obj.get("sources") or []:
                url = src.get("url")
                if not url:
                    warnings.add(f"content/{kind}/{path.name}: a source has no url")
                    continue
                check_url(url, f"content/{kind}/{path.name}, sources")
                sid = "web_" + hashlib.sha1(url.encode()).hexdigest()[:10]
                registry.setdefault(sid, {"title": src.get("title") or url, "url": url,
                                          "license": src.get("license"), "retrieved": src.get("retrieved")})
    groups = set(content["groups"])
    report["groups_without_content"] = [n for n, v in tree["nodes"].items() if v["rank"] != "species" and n not in groups]
    report["species_without_content"] = [n for n, v in tree["nodes"].items() if v["rank"] == "species" and n not in content["species"]]
    return content


def render_media(species):
    """(note for the report, text of the collection's data/<id>/media.js or None to leave it untouched)."""
    path = ROOT / "pipeline" / "media.py"
    if not path.exists():
        return "pipeline/media.py not present: media.js left untouched", None
    spec = importlib.util.spec_from_file_location("media", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    try:
        text = module.render(ROOT, [(s["id"], s["binomial"]) for s in species])
    except FileNotFoundError as e:
        return f"pipeline/media.py found no input ({e.filename}): media.js left untouched", None
    return "media.js written by pipeline/media.py render()", text


def check_output_urls(obj, where):
    """Every *url field that reaches the site is http(s), whichever input it came from."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and k.endswith("url"):
                check_url(v, f"{where}.{k}")
            else:
                check_output_urls(v, f"{where}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_output_urls(v, f"{where}[{i}]")


def js(name, obj):
    body = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return (f"// Generated by pipeline/build.py. Do not edit by hand.\n"
            f"window.VISU = window.VISU || {{}};\nVISU.{name} = {body};\n")


# --------------------------------------------------------------------------- reports

def credits_md(registry, used):
    lines = ["# Credits", "",
             "Generated by `pipeline/build.py`. Every fact in the study cards names its source; this page lists them all.",
             "Photo credits (author, licence, link) are listed in `media/CREDITS.md` and stored with each photo in `data/<collection>/media.js`.",
             "", "## Data sources", "", "| Source | Licence | Link | Retrieved | Used for |", "|---|---|---|---|---|"]
    for sid in sorted(k for k in registry if not k.startswith("web_") and ":" not in k):
        r = registry[sid]
        lines.append(f"| {r['title']} | {r['license']} | <{r['url']}> | {r['retrieved'] or ''} | {used.get(sid, '')} |")
    web = sorted((v["title"], v["url"], v.get("license") or "", v.get("retrieved") or "")
                 for k, v in registry.items() if k.startswith("web_"))
    if web:
        lines += ["", "## Sources cited by the written content (`content/`)", "",
                  "| Source | Licence | Link | Retrieved |", "|---|---|---|---|"]
        lines += [f"| {t} | {l} | <{u}> | {d} |" for t, u, l, d in web]
    lines += ["", "## Licence of the compiled data", "",
              "FishBase (CC BY-NC) and Animal Diversity Web (CC BY-NC-SA) allow only non-commercial use, so the "
              "compiled data and texts of this repository are licensed CC BY-NC-SA 4.0. Every FishBase and ADW value "
              "links the species' own page.", "",
              "## Not used", "",
              "SeaLifeBase: thin coverage of the listed species, with values attached to the wrong taxa. The "
              "Enciclopedia Virtual de los Vertebrados Españoles (MNCN-CSIC; CC BY-NC-ND, no derivatives) is a reference "
              "for writers, never copied. GoaT (Genomes on a Tree): its data licence could not be verified. "
              "See `docs/data-sources.md`.", ""]
    return "\n".join(lines)


def build_report(col, species_out, tree, report, warnings, snap, media_note):
    n = len(species_out)
    by_class = Counter(s["class"] for s in species_out.values())
    lines = [f"# Collection «{col['name']['es']}» ({col['id']})", "",
             f"{n} species, {len(tree['nodes']) - n} internal tree nodes, {len(tree['deep_path'])} deep-path steps.", ""]
    if warnings:
        lines += ["## Warnings", ""] + [f"- {w}" for w in warnings] + [""]
    lines += ["## Fact coverage", "", "Species with a fact for each field, overall and by class.", "",
              "| Field | All | " + " | ".join(by_class) + " |", "|---|---|" + "---|" * len(by_class)]
    for field in F.FIELDS:
        have = {sid for sid, s in species_out.items() if any(f["field"] == field for f in s["facts"])}
        per = [sum(1 for sid in have if species_out[sid]["class"] == c) for c in by_class]
        lines.append(f"| {field} | {len(have)} | " + " | ".join(f"{p}/{by_class[c]}" for p, c in zip(per, by_class)) + " |")
    rule = sum(1 for s in species_out.values() for f in s["facts"] if f["match"] == "rule")
    syn = sum(1 for s in species_out.values() for f in s["facts"] if f["match"] == "synonym")
    lines += ["", f"Facts from the class rule: {rule}. Facts matched through a same-taxon synonym: {syn}.", ""]
    src_use = Counter(src for s in species_out.values() for f in s["facts"] for src in f["src"])
    lines += ["Facts per source: " + ", ".join(f"{k} {v}" for k, v in sorted(src_use.items())) + ".", ""]

    lines += ["## Species missing facts", "", "Fields with no fact, per species (iucn and spain omitted when present).", ""]
    for sid, s in species_out.items():
        missing = [f for f in F.FIELDS if not any(x["field"] == f for x in s["facts"])
                   and not (f == "migration" and s["class"] != "Aves") and f != "dimorphism"]
        if missing:
            lines.append(f"- {s['binomial']} ({s['class']}): {', '.join(missing)}")
    lines += ["", "Migration is only expected for birds. Dimorphism is only stated when a male/female ratio supports it.", ""]

    lines += ["## Dropped matches (parent_of_split)", "",
              "Rows a dataset holds under a name that is a different species concept (split species mapped to the old "
              "parent). Their values are not used.", ""]
    for sid, d in report["dropped"]:
        lines.append(f"- {species_out[sid]['binomial']}: {d['dataset']} row '{d['matched_name']}' (via {d['via']})")
    lines.append("")

    lines += ["## Videos", ""]
    statuses = Counter((s["video"] or {}).get("status", "none") for s in species_out.values())
    lines += ["Status: " + ", ".join(f"{k} {v}" for k, v in sorted(statuses.items())) + ".", ""]
    for sid, s in species_out.items():
        v = s["video"] or {}
        rec = snap["links"]["links"].get(v.get("url"), {})
        if v.get("status") in ("broken", "unchecked"):
            why = "not checked yet" if v["status"] == "unchecked" else \
                (rec.get("reason") or rec.get("playability") or rec.get("http_status") or rec.get("oembed") or "")
            lines.append(f"- {v['status']}: {s['binomial']} <{v['url']}> {why}".rstrip())
    if report["link_unknown"]:
        lines += ["", "Not recognised, shown as link only; check by hand: " + ", ".join(report["link_unknown"])]
    none = [s["binomial"] for s in species_out.values() if not s["video"]]
    if none:
        lines += ["", f"Species without a video in videos.csv ({len(none)}): " + ", ".join(none)]
    lines.append("")

    lines += ["## Name flags", ""]
    for sid, s in species_out.items():
        g = snap["names"].get(s["binomial"]) or {}
        notes = []
        if g.get("rank") != "SPECIES":
            notes.append(f"GBIF found no species-level match ({g.get('matchType')})")
        elif g.get("status") != "ACCEPTED":
            notes.append(f"GBIF status {g.get('status')}, accepted name {g.get('accepted')}")
        refs = set(g.get("vernacular_es") or []) | set((snap["wikidata"].get(s["binomial"]) or {}).get("common_es") or [])
        wd_es = (snap["wikidata"].get(s["binomial"]) or {}).get("label_es")
        if wd_es:
            refs.add(wd_es)
        refs |= {e["common_es"] for e in snap["miteco"].get(s["binomial"], []) if e.get("common_es")}
        low = {r.lower() for r in refs}
        if refs and s["common_es"].lower() not in low:
            close = [r for r in sorted(refs) if edit_distance(r.lower(), s["common_es"].lower()) <= 2]
            if close:
                notes.append(f"Spanish name '{s['common_es']}' is 1–2 letters from '{close[0]}' (possible typo)")
            else:
                notes.append(f"Spanish name '{s['common_es']}' matches no reference name")
        if not s["keys"].get("wikidata"):
            notes.append("no Wikidata item for this binomial")
        if notes:
            lines.append(f"- {s['binomial']}: " + "; ".join(notes))
    lines.append("")

    lines += ["## Content", "", f"Species without a content file: {len(report['species_without_content'])}.",
              f"Tree nodes without a group content file: {len(report['groups_without_content'])}"
              + (": " + ", ".join(report["groups_without_content"]) if report["groups_without_content"] else "") + ".", ""]
    lines += ["## Media", "", media_note, ""]
    return "\n".join(lines)


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


# --------------------------------------------------------------------------- main

def register_species_source(registry, key, binomial, snap):
    """Per-species pages cited by a fact ("fishbase:<SpecCode>", "adw:<Genus_species>"): the dataset's entry
    with the species' own link, which the FishBase and ADW licences ask for."""
    kind, _, ident = key.partition(":")
    if not ident or key in registry or kind not in registry:
        return
    if kind == "fishbase":
        url = f"https://www.fishbase.se/summary/{ident}"
    elif kind == "adw":
        url = ((snap["traits"].get("adw", {}).get(binomial) or {}).get("v") or {}).get("url") \
            or f"https://animaldiversity.org/accounts/{ident}/"
    else:
        return
    base = registry[kind]
    registry[key] = dict(base, url=check_url(url, key), title=f"{base['title'].split(' (')[0]}: {binomial}")


def build(out=ROOT, collections_dir=COLLECTIONS, snapshot_dir=SNAPSHOT):
    """Build every collection from the committed inputs. `out` is where data/, reports/ and CREDITS.md go
    (tests use a temp dir and a fixture collection)."""
    collections = load_collections(collections_dir)
    snap = load_snapshot(snapshot_dir)
    all_sp = {s["id"]: s for c in collections for s in c["species"]}
    missing = sorted({s["binomial"] for s in all_sp.values() if s["binomial"] not in snap["names"]})
    if missing:
        raise BuildError(f"{rel(snapshot_dir)} is older than the species lists: {len(missing)} species not in it "
                         f"(e.g. {missing[:3]}). Run pipeline/refresh.py.")
    classify = make_classifier(load_synonym_verdicts(), {s["binomial"] for s in all_sp.values()})
    shared_warnings = Warnings()
    corrections = load_corrections(set(all_sp), shared_warnings)
    clade_rows = read_clades()

    retrieved = snap["meta"]["retrieved"]
    registry = OrderedDict()
    for sid, spec in SOURCES.items():
        registry[sid] = {"title": spec["title"], "url": spec["url"], "license": spec["license"],
                         "retrieved": snap["links"]["checked"] if sid == "video_links" else retrieved}
    files, fields_by_src, used_content, index, sections = {}, {}, set(), [], []
    totals = Counter()
    for col in collections:
        warnings = Warnings()
        report = {"dropped": [], "link_unknown": [], "link_missing": []}
        species = col["species"]
        ids = {s["id"] for s in species}
        col_corr = [c for c in corrections if not c["species_id"] or c["species_id"] in ids]
        species_out = build_species(species, snap, classify, col_corr, col["videos"], report)
        tree = build_tree(species, warnings, clade_rows, col["name"])
        content = compile_content(tree, warnings, registry, report, used_content, {s["class"] for s in species_out.values()})
        for s in species_out.values():
            for f in s["facts"]:
                for x in f["src"]:
                    register_species_source(registry, x, s["binomial"], snap)
                unknown = [x for x in f["src"] if x not in registry]
                if unknown:
                    raise BuildError(f"{s['id']}: fact '{f['field']}' cites unregistered source(s) {unknown}")
                for x in f["src"]:
                    fields_by_src.setdefault(x.split(":")[0], set()).add(f["field"])
        bestiary = {"collection": {"id": col["id"], "name": col["name"]}, "edition": col["edition"],
                    "generated": retrieved, "species": species_out, "tree": tree, "sources": registry,
                    "corrections": [correction(c) for c in col_corr if c["status"] == "accepted"]}
        check_output_urls(bestiary, f"{col['id']}.bestiary")
        check_output_urls(content, f"{col['id']}.content")
        media_note, media_js = render_media(species)
        d = out / "data" / col["id"]
        files[d / "bestiary.js"] = js("bestiary", bestiary)
        files[d / "content.js"] = js("content", content)
        if media_js is not None:
            files[d / "media.js"] = media_js
        index.append({"id": col["id"], "name": col["name"], "edition": col["edition"], "species": len(species_out),
                      "classes": len({s["class"] for s in species}), "orders": len({s["order"] for s in species})})
        sections.append(build_report(col, species_out, tree, report, warnings, snap, media_note))
        totals.update(species=len(species_out), nodes=len(tree["nodes"]), content=len(content["species"]) + len(content["groups"]),
                      facts=sum(len(s["facts"]) for s in species_out.values()), warnings=len(warnings))

    used = {k: ", ".join(sorted(v)) for k, v in fields_by_src.items()}
    used.update({"gbif": "names, keys, family, authority", "wikidata": used.get("wikidata", "") + ("; " if used.get("wikidata") else "") + "EN names, keys",
                 "inaturalist": "keys", "otl": "clade placements", "wikipedia_clades": "tree node links",
                 "video_links": "video status", "mdd": used.get("mdd", "") + "; EN names of mammals without a Wikidata label"})
    orphans = sorted(f"content/{k}/{p.name}" for k in ("species", "groups") for p in (CONTENT / k).glob("*.json")
                     if f"content/{k}/{p.name}" not in used_content) if CONTENT.exists() else []
    head = ["# Build report", "", f"Snapshot retrieved {retrieved}; links checked {snap['links']['checked']}. "
            f"{len(collections)} collection(s).", ""]
    if shared_warnings:
        head += ["## Shared warnings", ""] + [f"- {w}" for w in shared_warnings] + [""]
    head += ["Content files used by no collection: " + (", ".join(orphans) if orphans else "none") + ".", ""]
    if vocab.UNKNOWN:
        head += ["## Untranslated dataset values (skipped)", "", ", ".join(sorted(vocab.UNKNOWN)), ""]
    files[out / "data" / "collections.js"] = js("collections", {"default": collections[0]["id"], "list": index})
    files[out / "CREDITS.md"] = credits_md(registry, used)
    files[out / "reports" / "build-report.md"] = "\n".join(head) + "\n" + "\n".join(sections)
    write_all(files)
    print(f"built {len(collections)} collection(s): {totals['species']} species, {totals['nodes']} tree nodes, "
          f"{totals['facts']} facts, {totals['content']} content files. {totals['warnings'] + len(shared_warnings)} warning(s).")


if __name__ == "__main__":
    try:
        build()
    except BuildError as e:
        sys.exit(f"ERROR: {e}")
