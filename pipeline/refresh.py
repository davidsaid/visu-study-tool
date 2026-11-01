"""Refresh the committed snapshot from the network.

    .venv/bin/python pipeline/refresh.py            # use the HTTP cache when it is younger than 7 days
    .venv/bin/python pipeline/refresh.py --fresh    # ignore the HTTP cache (bulk datasets stay cached)

Reads every collections/<id>/species.csv (and videos.csv) and writes pipeline/snapshot/*.json: only the
rows and columns build.py uses, so the build runs offline and gives the same output for the same commit.
Raw downloads are cached in .cache/ (git-ignored).

Politeness: a User-Agent with a contact, at most one request per second per host, and
retries with exponential backoff on 429, 5xx and network errors.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import openpyxl

from common import CACHE, COLLECTIONS, SNAPSHOT, YOUTUBE_ID, BuildError, dump_json, load_collections
import adw
import fishbase
from sources import SOURCES, dataset_files

USER_AGENT = "visu-study-tool-pipeline/1.0 (https://github.com/davidsaid/visu-study-tool)"
HTTP_CACHE_DAYS = 7
MISSING = {"", "-999", "-999.0", "NA", "N/A", "nan", "NaN", "None", "?"}


# --------------------------------------------------------------------------- HTTP

class Http:
    def __init__(self, fresh):
        self.fresh = fresh
        self.locks, self.last = {}, {}
        self.guard = threading.Lock()
        (CACHE / "http").mkdir(parents=True, exist_ok=True)

    def _wait(self, host, interval):
        with self.guard:
            lock = self.locks.setdefault(host, threading.Lock())
        lock.acquire()
        delay = self.last.get(host, 0) + interval - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        return lock

    def get(self, url, data=None, headers=None, cache=True, interval=1.0, timeout=60):
        """Return (status, text). Status is an int, or a string such as 'timeout' for network failures."""
        key = hashlib.sha1((url + "\n" + (data or "")).encode()).hexdigest()
        path = CACHE / "http" / f"{key}.json"
        if cache and not self.fresh and path.exists() and time.time() - path.stat().st_mtime < HTTP_CACHE_DAYS * 86400:
            hit = json.loads(path.read_text())
            return hit["status"], hit["body"]
        host = urllib.parse.urlsplit(url).netloc
        hdrs = {"User-Agent": USER_AGENT, **(headers or {})}
        status, body = None, ""
        for attempt in range(5):
            lock = self._wait(host, interval)
            try:
                req = urllib.request.Request(url, data=data.encode() if data else None, headers=hdrs)
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    status, body = r.status, r.read().decode("utf-8", "replace")
            except urllib.error.HTTPError as e:
                status, body = e.code, e.read().decode("utf-8", "replace")
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
                status, body = ("timeout" if "timed out" in str(e) else "unreachable"), str(e)
            finally:
                self.last[host] = time.monotonic()
                lock.release()
            if status == 429 or (isinstance(status, int) and status >= 500) or isinstance(status, str):
                time.sleep(2 ** attempt)
                continue
            break
        if cache and isinstance(status, int) and status != 429 and status < 500:
            path.write_text(json.dumps({"url": url, "status": status, "body": body}))
        return status, body

    def json(self, url, **kw):
        status, body = self.get(url, **kw)
        if status != 200:
            return None
        return json.loads(body)

    def download(self, url, dest):
        """Stream a bulk file to disk (never re-downloaded while it exists)."""
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".part")
        for attempt in range(5):
            lock = self._wait(urllib.parse.urlsplit(url).netloc, 1.0)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=300) as r, open(tmp, "wb") as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
                tmp.rename(dest)
                return
            except (urllib.error.URLError, TimeoutError, OSError) as e:
                print(f"  download retry {attempt + 1}: {url}: {e}", file=sys.stderr)
                time.sleep(2 ** attempt)
            finally:
                lock.release()
        raise BuildError(f"could not download {url}")


def log(msg):
    print(msg, flush=True)


# --------------------------------------------------------------------------- GBIF

def canonical(name):
    return " ".join(name.split()[:2])


def gbif_names(http, species):
    """Match each binomial against the GBIF backbone; collect synonyms, IUCN and ES vernaculars."""
    out = {}
    for i, s in enumerate(species, 1):
        b = s["binomial"]
        m = http.json("https://api.gbif.org/v1/species/match?" + urllib.parse.urlencode(
            {"name": b, "strict": "true", "kingdom": "Animalia"})) or {}
        rec = {"matchType": m.get("matchType"), "status": m.get("status"), "usageKey": m.get("usageKey"),
               "acceptedKey": m.get("acceptedUsageKey") or m.get("usageKey"), "rank": m.get("rank"),
               "family": m.get("family"), "order": m.get("order"), "class": m.get("class"),
               "authorship": None, "accepted": None, "synonyms": [], "iucn": None, "vernacular_es": []}
        if m.get("rank") == "SPECIES" and m.get("usageKey"):
            name = m.get("scientificName", "")
            rec["authorship"] = name[len(m.get("canonicalName", "")):].strip() or None
            acc = http.json(f"https://api.gbif.org/v1/species/{rec['acceptedKey']}") or {}
            rec["accepted"] = acc.get("canonicalName")
            offset, syns = 0, set()
            while True:
                page = http.json(f"https://api.gbif.org/v1/species/{rec['acceptedKey']}/synonyms?limit=100&offset={offset}") or {}
                for r in page.get("results", []):
                    cn = r.get("canonicalName") or ""
                    if len(cn.split()) >= 2:
                        syns.add((cn, r.get("rank") or ""))
                if page.get("endOfRecords", True):
                    break
                offset += 100
            rec["synonyms"] = [{"name": n, "rank": r} for n, r in sorted(syns) if n != b]
            iucn = http.json(f"https://api.gbif.org/v1/species/{rec['usageKey']}/iucnRedListCategory")
            if iucn and iucn.get("code"):
                rec["iucn"] = {"code": iucn.get("code"), "category": iucn.get("category"),
                               "iucnTaxonID": iucn.get("iucnTaxonID")}
            vern = http.json(f"https://api.gbif.org/v1/species/{rec['acceptedKey']}/vernacularNames?limit=300") or {}
            rec["vernacular_es"] = sorted({v["vernacularName"].strip() for v in vern.get("results", [])
                                           if v.get("language") in ("spa", "es") and v.get("vernacularName")})
        out[b] = rec
        if i % 50 == 0:
            log(f"  gbif {i}/{len(species)}")
    return out


# --------------------------------------------------------------------------- Wikidata

WD_ITEM_PROPS = ["P141", "P183", "P9714", "P2974", "P1034"]


def sparql(http, query):
    status, body = http.get("https://query.wikidata.org/sparql",
                            data=urllib.parse.urlencode({"query": query, "format": "json"}),
                            headers={"Accept": "application/sparql-results+json"}, interval=2.0, timeout=120)
    if status != 200:
        raise BuildError(f"Wikidata SPARQL failed: {status} {body[:200]}")
    return [{k: v["value"] for k, v in b.items()} for b in json.loads(body)["results"]["bindings"]]


def wikidata(http, species):
    """Item, EN/ES labels, sitelinks and a few item-valued properties per binomial (P225 exact match).

    P2067 (mass) is never fetched: Wikidata mass values are often birth weights.
    """
    names = [s["binomial"] for s in species]
    items = {}
    for i in range(0, len(names), 80):
        values = " ".join(json.dumps(n) for n in names[i:i + 80])
        for r in sparql(http, f"""SELECT ?name ?item ?en ?es ?enwiki ?eswiki WHERE {{
              VALUES ?name {{ {values} }} ?item wdt:P225 ?name .
              OPTIONAL {{ ?item rdfs:label ?en FILTER(lang(?en)="en") }}
              OPTIONAL {{ ?item rdfs:label ?es FILTER(lang(?es)="es") }}
              OPTIONAL {{ ?enwiki schema:about ?item; schema:isPartOf <https://en.wikipedia.org/> }}
              OPTIONAL {{ ?eswiki schema:about ?item; schema:isPartOf <https://es.wikipedia.org/> }} }}"""):
            qid = r["item"].rsplit("/", 1)[1]
            if re.fullmatch(r"Q\d+", qid):      # skip lexemes and other non-item entities
                items.setdefault(r["name"], {}).setdefault(qid, r)
    out = {}
    for b in names:
        cands = items.get(b, {})
        if not cands:
            continue
        # Prefer the item with an English Wikipedia article, then the lowest Q number.
        qid = sorted(cands, key=lambda q: (not cands[q].get("enwiki"), int(q[1:])))[0]
        r = cands[qid]
        out[b] = {"qid": qid, "label_en": r.get("en"), "label_es": r.get("es"),
                  "enwiki": r.get("enwiki"), "eswiki": r.get("eswiki"), "common_es": []}
        for p in WD_ITEM_PROPS:
            out[b][p] = []
    by_qid = {v["qid"]: b for b, v in out.items()}
    qids = sorted(by_qid, key=lambda q: int(q[1:]))
    for i in range(0, len(qids), 100):
        values = " ".join(f"wd:{q}" for q in qids[i:i + 100])
        for p in WD_ITEM_PROPS:
            rows = sparql(http, f"""SELECT ?item ?v ?en ?es WHERE {{ VALUES ?item {{ {values} }} ?item wdt:{p} ?v .
                  OPTIONAL {{ ?v rdfs:label ?en FILTER(lang(?en)="en") }}
                  OPTIONAL {{ ?v rdfs:label ?es FILTER(lang(?es)="es") }} }}""")
            for r in rows:
                b = by_qid[r["item"].rsplit("/", 1)[1]]
                val = {"qid": r["v"].rsplit("/", 1)[1], "en": r.get("en"), "es": r.get("es")}
                if val not in out[b][p]:
                    out[b][p].append(val)
        for r in sparql(http, f"""SELECT ?item ?v WHERE {{ VALUES ?item {{ {values} }} ?item wdt:P1843 ?v FILTER(lang(?v)="es") }}"""):
            b = by_qid[r["item"].rsplit("/", 1)[1]]
            out[b]["common_es"].append(r["v"])
    for v in out.values():
        for p in WD_ITEM_PROPS:
            v[p].sort(key=lambda x: int(x["qid"][1:]) if x["qid"][1:].isdigit() else 0)
        v["common_es"] = sorted(set(v["common_es"]))
    return out


def countries(http):
    """English → Spanish names of every entity with an ISO 3166-1 alpha-2 code (for MDD distributions)."""
    rows = sparql(http, """SELECT ?iso ?en ?es WHERE { ?c wdt:P297 ?iso .
          ?c rdfs:label ?en FILTER(lang(?en)="en") ?c rdfs:label ?es FILTER(lang(?es)="es") }""")
    return {r["en"]: r["es"] for r in sorted(rows, key=lambda r: (r["en"], r["iso"]))}


# --------------------------------------------------------------------------- iNaturalist

def inaturalist(http, species):
    out = {}
    for s in species:
        d = http.json("https://api.inaturalist.org/v1/taxa?" + urllib.parse.urlencode(
            {"q": s["binomial"], "rank": "species", "per_page": 10})) or {}
        hit = next((t for t in d.get("results", []) if t.get("name") == s["binomial"]), None)
        if hit:
            out[s["binomial"]] = hit["id"]
    return out


# --------------------------------------------------------------------------- video links

def check_youtube(http, video_id):
    oembed_url = "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(
        f"https://www.youtube.com/watch?v={video_id}", safe="")
    oembed, _ = http.get(oembed_url, cache=False, interval=1.5)
    rec = {"oembed": oembed, "playability": None, "reason": None, "playable_in_embed": None}
    if oembed == 200:
        rec["status"] = "ok"
        return rec
    _, page = http.get(f"https://www.youtube.com/watch?v={video_id}", cache=False, interval=2.0,
                       headers={"Accept-Language": "en", "User-Agent": "Mozilla/5.0 (Macintosh) " + USER_AGENT})
    st = re.search(r'"playabilityStatus":\{"status":"([A-Z_]+)"(?:,"reason":"([^"]*)")?', page or "")
    emb = re.search(r'"playableInEmbed":(true|false)', page or "")
    rec.update(playability=st.group(1) if st else None, reason=(st.group(2) or "") if st else None,
               playable_in_embed=emb.group(1) if emb else None)
    if oembed == 401 and rec["playability"] == "OK":
        rec["status"] = "link_only"          # plays on YouTube, embedding disabled by the uploader
    elif rec["playability"] in ("ERROR", "LOGIN_REQUIRED", "UNPLAYABLE") or oembed in (400, 404):
        rec["status"] = "broken"
    else:
        rec["status"] = "unknown"            # page not recognised: listed for a manual check, never 'broken'
    return rec


def check_link(http, url):
    host = urllib.parse.urlsplit(url).netloc.lower()
    rec = {"url": url, "host": host, "checked_url": url}
    if "youtube.com" in host or "youtu.be" in host:
        m = YOUTUBE_ID.search(url)
        raw = m.group(1) if m else ""
        vid = raw[:11]
        if len(raw) < 11:
            rec.update(status="broken", reason=f"malformed video id '{raw}' ({len(raw)} characters, YouTube uses 11)")
            return rec
        rec.update(check_youtube(http, vid))
        if len(raw) > 11:      # junk glued to the id, e.g. 'W1tbmBP2cZ0O.'
            rec["repaired_url"] = f"https://www.youtube.com/watch?v={vid}"
            rec["reason"] = ((rec.get("reason") or "") + f" (trailing characters removed from '{url}')").strip()
        return rec
    if "vimeo.com" in host:
        status, _ = http.get("https://vimeo.com/api/oembed.json?url=" + urllib.parse.quote(url, safe=""), cache=False)
        rec.update(http_status=status, status="ok" if status == 200 else "broken")
        return rec
    status, _ = http.get(url, cache=False, timeout=30)
    rec["http_status"] = status
    if status == 200:
        rec["status"] = "link_only"
    elif status == 403 and "fishbase.org" in host:
        rec.update(status="link_only", reason="403 to scripts, loads in a browser (bot protection)")
    elif status in (404, 410) or status in ("timeout", "unreachable"):
        rec["status"] = "broken"
        if "fishbase.in" in host:
            rec["suggested_url"] = url.replace("www.fishbase.in", "www.fishbase.se")
    else:
        rec["status"] = "unknown"
    return rec


def links(http, urls):
    """{url: check record} for every video URL of every collection."""
    out = {}
    for i, url in enumerate(urls, 1):
        out[url] = check_link(http, url)
        if i % 50 == 0:
            log(f"  links {i}/{len(urls)}")
    return out


# --------------------------------------------------------------------------- bulk datasets

def ensure_datasets(http):
    meta = {}
    for key, sid, spec in dataset_files():
        path = CACHE / "datasets" / spec["file"]
        if not path.exists():
            log(f"  downloading {key} from {spec['download']}")
            http.download(spec["download"], path)
        meta[key] = {"source": sid, "download": spec["download"],
                     "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    return meta


def open_text(spec, encoding="utf-8"):
    path = CACHE / "datasets" / spec["file"]
    raw = zipfile.ZipFile(path).read(spec["member"]) if spec.get("member") else path.read_bytes()
    try:
        return raw.decode(encoding)
    except UnicodeDecodeError:
        return raw.decode("latin-1")


def table_rows(spec, delimiter=","):
    if spec["file"].endswith(".xlsx"):
        wb = openpyxl.load_workbook(CACHE / "datasets" / spec["file"], read_only=True, data_only=True)
        it = wb[spec["sheet"]].iter_rows(values_only=True)
        header = [" ".join(str(h).split()) if h is not None else "" for h in next(it)]
        for row in it:
            yield dict(zip(header, row))
        wb.close()
        return
    # Tree of Sex uses classic-Mac line ends (CR only); AnAge uses CRLF.
    text = open_text(spec).replace("\r\n", "\n")
    text = text.replace("\r", "\n" if "\n" not in text else " ")
    for row in csv.DictReader(io.StringIO(text), delimiter=delimiter):
        yield {(" ".join(k.split()) if k else ""): v for k, v in row.items()}


def clean(v):
    if v is None:
        return None
    if isinstance(v, float):
        return None if v != v or v == -999 else (int(v) if v.is_integer() else v)
    if isinstance(v, int):
        return None if v == -999 else v
    s = str(v).strip()
    return None if s in MISSING else s


FISH = {"Actinopterygii", "Chondrichthyes", "Sarcopterygii", "Hyperoartia", "Myxini"}
ALL = {"Mammalia", "Aves", "Reptilia", "Amphibia"} | FISH

# dataset key -> (spec lookup, delimiter, name function, applicable classes, columns kept)
DATASETS = {
    "amniote_lhd": (",", lambda r: f"{r['genus']} {r['species']}", {"Mammalia", "Aves", "Reptilia"},
                    ["adult_body_mass_g", "female_body_mass_g", "male_body_mass_g", "adult_svl_cm", "female_svl_cm",
                     "male_svl_cm", "no_sex_svl_cm", "maximum_longevity_y", "gestation_d", "incubation_d",
                     "litter_or_clutch_size_n", "female_maturity_d"]),
    "anage": ("\t", lambda r: f"{r['Genus']} {r['Species']}", ALL,
              ["Class", "Adult weight (g)", "Maximum longevity (yrs)", "Specimen origin", "Data quality",
               "Gestation/Incubation (days)", "Litter/Clutch size", "Female maturity (days)"]),
    "avonet": (None, lambda r: r["Species1"], {"Aves"},
               ["Mass", "Habitat", "Migration", "Trophic.Niche", "Primary.Lifestyle"]),
    "combine": (",", lambda r: r["iucn2020_binomial"], {"Mammalia"},
                ["adult_mass_g", "adult_body_length_mm", "max_longevity_d", "gestation_length_d", "litter_size_n",
                 "activity_cycle", "freshwater", "marine", "terrestrial_non-volant", "terrestrial_volant",
                 "female_maturity_d"]),
    "elton_mammals": ("\t", lambda r: r["Scientific"], {"Mammalia"},
                      ["Diet-Inv", "Diet-Vend", "Diet-Vect", "Diet-Vfish", "Diet-Vunk", "Diet-Scav", "Diet-Fruit",
                       "Diet-Nect", "Diet-Seed", "Diet-PlantO", "Activity-Nocturnal", "Activity-Crepuscular",
                       "Activity-Diurnal", "BodyMass-Value"]),
    "elton_birds": ("\t", lambda r: r["Scientific"], {"Aves"},
                    ["Diet-Inv", "Diet-Vend", "Diet-Vect", "Diet-Vfish", "Diet-Vunk", "Diet-Scav", "Diet-Fruit",
                     "Diet-Nect", "Diet-Seed", "Diet-PlantO", "Nocturnal", "BodyMass-Value"]),
    "pantheria": ("\t", lambda r: r["MSW05_Binomial"], {"Mammalia"},
                  ["5-1_AdultBodyMass_g", "13-1_AdultHeadBodyLen_mm", "17-1_MaxLongevity_m", "9-1_GestationLen_d",
                   "15-1_LitterSize", "1-1_ActivityCycle", "12-2_Terrestriality"]),
    "amphibio": (",", lambda r: r["Species"], {"Amphibia"},
                 ["Fos", "Ter", "Aqu", "Arb", "Leaves", "Flowers", "Seeds", "Fruits", "Arthro", "Vert", "Diu", "Noc",
                  "Crepu", "Body_mass_g", "Body_size_mm", "Longevity_max_y", "Litter_size_min_n", "Litter_size_max_n",
                  "Dir", "Lar", "Viv", "Age_at_maturity_min_y", "Age_at_maturity_max_y"]),
    "repttraits": (None, lambda r: r["Species"], {"Reptilia"},
                   ["Main biogeographic region", "Microhabitat", "Habitat type", "Diet", "Active time",
                    "Maximum Longevity (years)", "Maximum body mass (g)", 'Maximum total length ("TL", mm)',
                    'Maximum length ("SVL", mm)/straight carapace length for turtles ("SCL", mm)',
                    'Maximum female length ("SVL", mm)/straight carapace length for turtles ("SCL", mm)',
                    'Maximum male length ("SVL", mm)/straight carapace length for turtles ("SCL", mm)',
                    "Reproductive mode", "Sex-determining mechanism (GSD or TSD)",
                    "Mean number of offspring per litter or number of eggs per clutch", "Smallest clutch size",
                    "Largest clutch size"]),
    "squambase": (None, lambda r: r["Species name (Binomial)"], {"Reptilia"},
                  ["maximum total length (mm)", "maximum SVL (mm)", "mean female SVL (mm)", "mean female mass (g)",
                   "Maximum Longevity (years)", "Activity time", "substrate", "Diet", "Mode of reproduction"]),
    "tos": (",", lambda r: f"{str(r['Genus']).strip()} {str(r['species']).strip()}", ALL,
            ["Higher taxonomic group",
             "Sexual system (hermaphrodite,monoecy,dioecy,gynodioecy,androdioecy,gynomonoecy,andromonoecy,polygamodioecy,polygamomonoecy,apomictic,other)",
             "Karyotype (ZO,ZW,XY,XO,WO,homomorphic,complex XY,complex ZW)",
             "Genotypic (male heterogametic,female heterogametic,GSD,polygenic)",
             "Environmental (TSD,TSD Ia,TSD Ib,TSD II,size,density,pH,ESD_other)"]),
    "mdd": (",", lambda r: r["sciName"].replace("_", " "), {"Mammalia"},
            ["mainCommonName", "family", "countryDistribution", "continentDistribution", "biogeographicRealm",
             "iucnStatus", "authoritySpeciesAuthor", "authoritySpeciesYear", "authorityParentheses"]),
}


def candidates(binomial, names):
    """Other names under which a dataset may list the species, with how they were found."""
    g = names.get(binomial) or {}
    out = []
    accepted = g.get("accepted") or ""
    if accepted and canonical(accepted) != binomial:
        out.append((canonical(accepted), "accepted" if len(accepted.split()) == 2 else "trinomial"))
    for s in g.get("synonyms", []):
        n = canonical(s["name"])
        if n == binomial:
            continue
        via = "synonym" if len(s["name"].split()) == 2 else "trinomial"
        if (n, via) not in out and n not in [o[0] for o in out]:
            out.append((n, via))
    return out


def extract(species, names):
    """Keep, for each dataset, only the rows matching a bestiary species (exact first, then candidates)."""
    out = {}
    specs = {key: spec for key, _, spec in dataset_files()}
    for key, (delim, name_of, classes, cols) in DATASETS.items():
        index = {}
        for row in table_rows(specs[key], delim or ","):
            row = {k: v for k, v in row.items()}
            try:
                n = " ".join(str(name_of(row)).split())
            except (KeyError, TypeError):
                continue
            if not n:
                continue
            vals = {c: clean(row.get(c)) for c in cols}
            vals = {c: v for c, v in vals.items() if v is not None}
            if n in index:   # several rows per species (Tree of Sex): merge distinct values
                for c, v in vals.items():
                    old = index[n].get(c)
                    if old is None:
                        index[n][c] = v
                    elif str(v) not in str(old).split(" | "):
                        index[n][c] = f"{old} | {v}"
            else:
                index[n] = vals
        hits = {}
        for s in species:
            if s["class"] not in classes:
                continue
            b = s["binomial"]
            if b in index:
                hits[b] = {"name": b, "via": "exact", "v": index[b]}
                continue
            for n, via in candidates(b, names):
                if n in index:
                    hits[b] = {"name": n, "via": via, "v": index[n]}
                    break
        out[key] = hits
        log(f"  {key}: {len(hits)} species matched")
    return out


def miteco(species):
    spec = SOURCES["miteco"]
    wanted = {s["binomial"] for s in species}
    out = {}
    status_col = None
    # Higher taxa listed as a whole carry a footnote mark, "(6) Alopiidae"; the footnotes at the end
    # of the sheet ("(6) Se incluyen todas las especies de la Familia Alopiidae") list their species.
    footnoted, current_note = {}, None
    for row in table_rows(spec):
        if status_col is None:
            status_col = next(c for c in row if c.startswith("Listado de Especies"))
        old_name = str(row.get("Nombre científico LESRPE / CEEA") or "").strip()
        mark = re.match(r"^\((\d+)\)\s*(.*)$", old_name)
        status = clean(row.get(status_col))
        if mark and status:
            footnoted[mark.group(1)] = {"status": status, "population": clean(row.get("Población referida")),
                                        "norma": clean(row.get("Norma")), "listed_as": mark.group(2).strip()}
        elif mark and "incluyen" in mark.group(2):
            current_note = mark.group(1)
        elif old_name.startswith("["):
            current_note = None
        names = {canonical(str(row.get(c) or "")) for c in ("Nombre científico actualizado", "Nombre científico LESRPE / CEEA")}
        for b in sorted(names & wanted):
            if status is None and current_note in footnoted:
                entry = dict(footnoted[current_note], common_es=None)
            else:
                entry = {"status": status, "population": clean(row.get("Población referida")),
                         "common_es": clean(row.get("Nombre común")), "norma": clean(row.get("Norma"))}
            if entry not in out.setdefault(b, []):
                out[b].append(entry)
    log(f"  miteco: {len(out)} species listed")
    return out


# --------------------------------------------------------------------------- main

def fishbase_rows(http, species):
    """Download the FishBase tables once (kept in .cache/datasets/fishbase/), then extract the listed fishes."""
    folder = CACHE / "datasets" / "fishbase" / fishbase.VERSION
    for table in fishbase.TABLES:
        path = folder / f"{table}.parquet"
        if not path.exists():
            log(f"  downloading FishBase {table}")
            http.download(fishbase.BASE + f"{table}.parquet", path)
    return fishbase.extract(species, folder)


OUT = {"snapshot": SNAPSHOT}


def write(name, obj):
    OUT["snapshot"].mkdir(parents=True, exist_ok=True)
    (OUT["snapshot"] / name).write_text(dump_json(obj), encoding="utf-8")
    log(f"wrote {OUT['snapshot'] / name}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fresh", action="store_true", help="ignore the HTTP cache")
    ap.add_argument("--skip-links", action="store_true", help="keep the previous link check")
    ap.add_argument("--collections", default=str(COLLECTIONS), help="folder of collections (tests use a fixture)")
    ap.add_argument("--snapshot", default=str(SNAPSHOT), help="where to write the snapshot (tests use a fixture)")
    args = ap.parse_args()
    OUT["snapshot"] = Path(args.snapshot)
    collections = load_collections(Path(args.collections))
    species, seen = [], set()
    for c in collections:
        species += [s for s in c["species"] if s["id"] not in seen and not seen.add(s["id"])]
    urls = sorted({v["url"] for c in collections for v in c["videos"].values()})
    http = Http(args.fresh)
    today = dt.date.today().isoformat()
    log(f"{len(species)} species. Datasets...")
    datasets = ensure_datasets(http)

    with ThreadPoolExecutor(5) as ex:
        f_gbif = ex.submit(gbif_names, http, species)
        f_wd = ex.submit(wikidata, http, species)
        f_ctry = ex.submit(countries, http)
        f_inat = ex.submit(inaturalist, http, species)
        f_links = None if args.skip_links else ex.submit(links, http, urls)
        names = f_gbif.result()
        log("GBIF done; extracting dataset rows...")
        # Synonym lists are only needed for matching above; the build reads the matches in traits.json.
        write("names.json", {b: {k: v for k, v in r.items() if k != "synonyms"} for b, r in names.items()})
        traits = extract(species, names)
        traits["fishbase"] = fishbase_rows(http, species)
        log(f"  fishbase: {len(traits['fishbase'])} species matched")
        traits["adw"] = adw.extract(species, names, CACHE / "http-adw", USER_AGENT, log)
        log(f"  adw: {len(traits['adw'])} species with a dimorphism entry")
        write("traits.json", traits)
        write("miteco.json", miteco(species))
        write("wikidata.json", f_wd.result())
        write("countries.json", f_ctry.result())
        write("inaturalist.json", f_inat.result())
        if f_links:
            write("links.json", {"checked": today, "links": f_links.result()})
    write("meta.json", {"retrieved": today, "datasets": datasets, "species": len(species)})


if __name__ == "__main__":
    try:
        main()
    except BuildError as e:
        sys.exit(f"ERROR: {e}")
