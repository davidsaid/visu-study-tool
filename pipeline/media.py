"""Photo pipeline for the VISU study tool.

Commands (run from anywhere with the repo's virtualenv):

    .venv/bin/python pipeline/media.py select   # network: rank candidates, write curation/media_manifest.json
    .venv/bin/python pipeline/media.py select --exam-only   # keep the practice photos, (re)choose only the exam photos
    .venv/bin/python pipeline/media.py fetch    # download originals into .cache/media/, render media/<species>/<hash>.jpg
    .venv/bin/python pipeline/media.py emit     # write data/<collection>/media.js from the manifest (also: media.emit(repo_root))
    .venv/bin/python pipeline/media.py report   # write reports/media-report.md and media/CREDITS.md

Sources: iNaturalist research-grade observations (CC0 / CC BY / CC BY-SA photos, originals from the
`inaturalist-open-data` bucket) and Wikimedia Commons (Wikidata P18 plus Quality and Featured images in
the species category). NC and ND licences are never selected. See docs/data-format.md, `VISU.media`.

Each species gets two sets of photos: up to PHOTOS_PER_SPECIES practice photos, shown everywhere, and up to
EXAM_PHOTOS exam photos, shown only in the mock exam so that it tests photos she has never practised on. Exam
photos come from the candidates left after the practice ones, preferring other observers than the practice set's.

Maintainer overrides live in curation/media_overrides.csv (pin / exam / exclude / crop / trim) and survive re-runs.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import math
import pathlib
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from common import BuildError, all_species, check_url, load_collections, read_csv, write_all

REPO = pathlib.Path(__file__).resolve().parent.parent
UA = "visu-study-tool-media/1.0 (zoology study site; https://github.com/davidsaid/visu-study-tool)"

PHOTOS_PER_SPECIES = 4
MIN_PHOTOS = 3
EXAM_PHOTOS = 2        # held out from practice; the mock exam shows only these (see app/engine.js buildModel)
MAX_SIDE = 1200
JPEG_QUALITY = 78
BUDGET_MB = 330         # 250 MB before the exam photos (2026-11-13)
MIN_MATCHED_SHARE = 0.5   # render() refuses a list of 20+ species of which fewer have photos

INAT_LICENSES = {
    "cc0": ("CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"),
    "cc-by": ("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"),
    "cc-by-sa": ("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
    "cc-by-nc": ("CC BY-NC 4.0", "https://creativecommons.org/licenses/by-nc/4.0/"),
    "cc-by-nc-sa": ("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"),
}
# Display licences we ship. Non-commercial (NC) licences are allowed since 2026-11-01 (the site's data is
# CC BY-NC-SA); no-derivatives (ND) ones are not, because a crop box would make an adaptation.
# Commons "Public domain" files are freely redistributable, so they are allowed too.
ALLOWED_LICENSE = re.compile(r"^(CC0 1\.0|CC BY(-NC)?(-SA)? \d\.\d( [A-Za-z-]{2,})?|Public domain)$")

# iNat controlled terms (GET /v1/controlled_terms, read 2026-11-01).
TERM_LIFE_STAGE, TERM_ALIVE, TERM_EVIDENCE, TERM_SEX = 1, 17, 22, 9
V_ADULT, V_LARVA, V_EGG, V_JUVENILE = 2, 6, 7, 8
V_ALIVE, V_DEAD, V_ORGANISM = 18, 19, 24
V_FEMALE, V_MALE = 10, 11

# Commons files whose title or categories match these are never auto-selected.
REJECT = re.compile(
    r"skelet|skull|cranium|crania|\bbones?\b|fossil|\beggs?\b|specimen|museum|taxiderm|stuffed|mounted|preserved|"
    r"\bdead\b|carcass|roadkill|corpse|killed|hunting|trophy|\bmeat\b|cuisine|\bfood\b|market|\bcaught\b|fishing|"
    r"\bmaps?\b|range|distribution|drawing|illustration|painting|engraving|lithograph|\bart\b|stamp|coin|statue|"
    r"sculpture|logo|diagram|anatomy|x-ray|dissect|footprint|\btracks?\b|dropping|\bscat\b|pellet|feather|"
    r"familiaris|\bcatus\b|domestic|caballus|\bbreeds?\b|\bkoi\b|\bfancy\b|\bpets?\b|with other species|"
    r"\bangler|stockfish|tinned|canned|\bgardens?\b|\bprints?\b|iconographia",
    re.I,
)
# For extinct species, archival and museum photos are the only option (e.g. Thylacinus).
REJECT_RELAXED = re.compile(
    r"\bmaps?\b|range map|distribution|drawing|illustration|painting|engraving|lithograph|stamp|coin|logo|"
    r"diagram|skelet|skull|\bbones?\b|fossil|familiaris|\bcatus\b|domestic|caballus|\bbreeds?\b|\bprints?\b|"
    r"iconographia",
    re.I,
)
ZOO = re.compile(r"\bzoo|zoolog|captiv|aquari|tierpark|wildlife park|safari park", re.I)

_rate_lock = threading.Lock()
_last_call: dict[str, float] = {}
MIN_INTERVAL = {"api.inaturalist.org": 1.05, "query.wikidata.org": 1.0, "commons.wikimedia.org": 0.25}


def paths(repo: pathlib.Path) -> dict[str, pathlib.Path]:
    return {
        "collections": repo / "collections",
        "manifest": repo / "curation" / "media_manifest.json",
        "overrides": repo / "curation" / "media_overrides.csv",
        "cache": repo / ".cache" / "media",
        "media": repo / "media",
        "data": repo / "data",
        "report": repo / "reports" / "media-report.md",
        "credits": repo / "media" / "CREDITS.md",
    }


# ---------------------------------------------------------------- HTTP

def _throttle(url: str) -> None:
    host = urllib.parse.urlparse(url).netloc
    gap = MIN_INTERVAL.get(host)
    if not gap:
        return
    with _rate_lock:
        wait = _last_call.get(host, 0) + gap - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        _last_call[host] = time.monotonic()


def http_get(url: str, tries: int = 5) -> bytes:
    for attempt in range(tries):
        _throttle(url)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(int(e.headers.get("Retry-After") or 0) or 5 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt < tries - 1:
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError(url)


class Api:
    """JSON GETs with a disk cache, so re-running `select` after editing overrides costs no requests."""

    def __init__(self, cache_dir: pathlib.Path, refresh: bool = False):
        self.dir = cache_dir / "api"
        self.dir.mkdir(parents=True, exist_ok=True)
        self.refresh = refresh

    def get(self, url: str, params: dict | None = None):
        if params:
            url += "?" + urllib.parse.urlencode(params)
        f = self.dir / (hashlib.sha1(url.encode()).hexdigest() + ".json")
        if f.exists() and not self.refresh:
            return json.loads(f.read_text())
        try:
            data = json.loads(http_get(url))
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                return None
            raise
        f.write_text(json.dumps(data))
        return data


# ---------------------------------------------------------------- inputs

def load_species(repo: pathlib.Path) -> list[tuple[str, str]]:
    """(species_id, binomial) of every collection, each once, through the same validating reader build.py uses."""
    return [(s["id"], s["binomial"]) for s in all_species(paths(repo)["collections"])]


OVERRIDES_HEADER = ["species_id", "action", "media_id_or_url", "value"]
OVERRIDES_TEMPLATE = (
    "species_id,action,media_id_or_url,value\n"
    "# Lines starting with # are ignored. action is pin, exam, exclude or crop.\n"
    "#   pin:     always use this photo (a media id from media/CREDITS.md, a Commons File: URL or an iNat observation URL)\n"
    "#   exam:    like pin, but as one of the exam photos, which practice never shows\n"
    "#   exclude: never use this photo; put the reason in value\n"
    "#   crop:    value is \"x,y,w,h\" (quoted) as fractions of the photo, used by thumbnails only\n"
    "#   trim:    value is \"x,y,w,h\" (quoted) as fractions; cut from the file itself (e.g. a caption that names the species)\n"
    "# lynx_pardinus,exclude,inat-187857126,head cut off\n"
)


def load_overrides(repo: pathlib.Path) -> list[dict]:
    p = paths(repo)["overrides"]
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(OVERRIDES_TEMPLATE, encoding="utf-8")
    rows = read_csv(p, OVERRIDES_HEADER, comment="#")
    for r in rows:
        r["action"] = r["action"].lower()
        if r["action"] not in ("pin", "exam", "exclude", "crop", "trim"):
            raise BuildError(f"curation/media_overrides.csv row {r['_line']}: unknown action {r['action']!r} "
                             f"(must be pin, exam, exclude, crop or trim)")
    return rows


def matches(cand: dict, ref: str) -> bool:
    ref = ref.strip()
    if not ref:
        return False
    if ref == cand["id"]:
        return True
    norm = lambda u: urllib.parse.unquote(u or "").replace(" ", "_").split("?")[0].rstrip("/").lower()
    return norm(ref) in {norm(cand.get(k)) for k in ("source_url", "page_url", "original_url") if cand.get(k)}


# ---------------------------------------------------------------- iNaturalist

def inat_taxon(api: Api, binomial: str) -> tuple[int | None, str]:
    # /taxa ranks tautonyms (Bubo bubo, Gulo gulo) badly, so autocomplete is consulted too.
    results = []
    for endpoint in ("taxa", "taxa/autocomplete"):
        d = api.get(f"https://api.inaturalist.org/v1/{endpoint}", {"q": binomial, "per_page": 10, "is_active": "true"})
        results += (d or {}).get("results", [])
    for r in results:
        if r["name"].lower() == binomial.lower() and r["rank"] in ("species", "hybrid", "subspecies"):
            return r["id"], "exact"
    for r in results:
        if (r.get("matched_term") or "").lower() == binomial.lower() and r["rank"] == "species":
            return r["id"], f"synonym of {r['name']}"
    return None, "no iNaturalist taxon"


def _inat_roles(obs: dict) -> tuple[list[str], set[int]]:
    values = {a.get("controlled_value_id") for a in obs.get("annotations") or []}
    roles = [name for v, name in ((V_ADULT, "adult"), (V_JUVENILE, "juvenile"), (V_MALE, "male"), (V_FEMALE, "female"))
             if v in values]
    return roles, values


def inat_candidates(api: Api, taxon_id: int, retrieved: str) -> list[dict]:
    base = {"taxon_id": taxon_id, "quality_grade": "research", "photo_license": ",".join(INAT_LICENSES),
            "order_by": "votes", "photos": "true"}
    pages = [api.get("https://api.inaturalist.org/v1/observations", {**base, "per_page": 40})]
    if (pages[0] or {}).get("total_results", 0) > 40:
        for sex in (V_MALE, V_FEMALE):
            pages.append(api.get("https://api.inaturalist.org/v1/observations",
                                 {**base, "per_page": 6, "term_id": TERM_SEX, "term_value_id": sex}))
    seen, out = set(), []
    for page in pages:
        for obs in (page or {}).get("results", []):
            # Observations with sounds usually carry spectrogram images instead of photos.
            if obs["id"] in seen or obs.get("captive") or obs.get("sounds"):
                continue
            seen.add(obs["id"])
            roles, values = _inat_roles(obs)
            if V_DEAD in values or V_EGG in values or (values & {23, 25, 26, 27, 28, 30, 31, 35}):
                continue
            photos = obs.get("photos") or []
            idx, photo = next(((i, p) for i, p in enumerate(photos) if p.get("license_code") in INAT_LICENSES
                               and not p.get("hidden")), (None, None))
            if not photo:
                continue
            lic, lic_url = INAT_LICENSES[photo["license_code"]]
            user = obs.get("user") or {}
            dims = photo.get("original_dimensions") or {}
            url = photo["url"]
            score = 1.0 + min(2.5, 0.7 * math.log1p(obs.get("faves_count") or 0))
            score += 0.2 if values & {V_ALIVE, V_ORGANISM} else 0
            score += 0.2 if "adult" in roles else 0
            score -= 0.8 if "juvenile" in roles else 0
            score -= 3.0 if V_LARVA in values else 0
            score -= 0.2 if idx else 0
            out.append({
                "id": f"inat-{photo['id']}",
                "source": "inaturalist",
                "source_url": f"https://www.inaturalist.org/photos/{photo['id']}",
                "page_url": f"https://www.inaturalist.org/observations/{obs['id']}",
                "original_url": re.sub(r"/square\.", "/original.", url),
                "author": user.get("name") or user.get("login") or "unknown",
                "author_url": f"https://www.inaturalist.org/people/{user.get('login')}" if user.get("login") else None,
                "observer": f"inat:{user.get('login')}",
                "license": lic,
                "license_url": lic_url,
                "attribution_text": photo.get("attribution"),
                "orig_w": dims.get("width"),
                "orig_h": dims.get("height"),
                "role": roles,
                "role_source": "inat_annotation" if roles else None,
                "retrieved": retrieved,
                "quality": {"faves": obs.get("faves_count") or 0},
                "base_score": score,
            })
    return out


# ---------------------------------------------------------------- Wikidata + Commons

def wikidata_items(api: Api, binomials: list[str]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for i in range(0, len(binomials), 60):
        values = " ".join(json.dumps(b) for b in binomials[i:i + 60])
        q = (f"SELECT ?name ?item ?img ?cat WHERE {{ VALUES ?name {{ {values} }} ?item wdt:P225 ?name . "
             f"OPTIONAL {{ ?item wdt:P18 ?img }} OPTIONAL {{ ?item wdt:P373 ?cat }} }}")
        d = api.get("https://query.wikidata.org/sparql", {"format": "json", "query": q})
        for row in d["results"]["bindings"]:
            name = row["name"]["value"]
            rec = found.setdefault(name, {"qid": row["item"]["value"].rsplit("/", 1)[1], "p18": [], "p373": None})
            img = row.get("img", {}).get("value")
            if img:
                title = "File:" + urllib.parse.unquote(img.rsplit("/", 1)[1]).replace("_", " ")
                if title not in rec["p18"]:
                    rec["p18"].append(title)
            if row.get("cat") and not rec["p373"]:
                rec["p373"] = row["cat"]["value"]
    return found


COMMONS_API = "https://commons.wikimedia.org/w/api.php"
COMMONS_PROPS = {
    "action": "query", "format": "json", "prop": "imageinfo|categories", "cllimit": "max",
    "iiprop": "url|size|mime|extmetadata|user", "iiurlwidth": 1920,
    "iiextmetadatafilter": "Artist|LicenseShortName|LicenseUrl|Credit",
}


def commons_pages(api: Api, params: dict) -> list[dict]:
    """Run a Commons query, following prop continuation (categories) but not generator continuation."""
    pages: dict[int, dict] = {}
    cont: dict = {}
    while True:
        d = api.get(COMMONS_API, {**COMMONS_PROPS, **params, **cont})
        for p in ((d or {}).get("query") or {}).get("pages", {}).values():
            cur = pages.setdefault(p.get("pageid", id(p)), p)
            if cur is not p:
                cur.setdefault("categories", []).extend(p.get("categories", []))
        c = (d or {}).get("continue") or {}
        if not any(k for k in c if k not in ("continue", "gsroffset")):
            return list(pages.values())
        cont = {k: v for k, v in c.items() if k != "gsroffset"}


def strip_html(s: str | None) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def clean_author(s: str) -> str:
    """Tidy common Commons Artist boilerplate into a plain credit line."""
    m = re.match(r"No machine-readable author provided\. (.+?) assumed", s)
    if m:
        return m.group(1)
    m = re.match(r"This [Pp]hoto was taken by (.+?)\s+\.", s)
    if m:
        return m.group(1)
    half = len(s) // 2
    if len(s) % 2 == 1 and s[:half] == s[half + 1:]:  # "Unknown author Unknown author"
        return s[:half]
    return s


def commons_license(short: str | None) -> str | None:
    s = (short or "").strip()
    if re.search(r"\bND\b|no-?deriv", s, re.I):
        return None
    if re.fullmatch(r"CC0( 1\.0)?|CC-zero|Cc-zero", s, re.I):
        return "CC0 1.0"
    m = re.fullmatch(r"CC[ -]BY(-NC)?(-SA)?[ -](\d\.\d)([ -][A-Za-z-]{2,})?", s, re.I)
    if m:
        return f"CC BY{(m.group(1) or '').upper()}{(m.group(2) or '').upper()} {m.group(3)}{(m.group(4) or '').replace('-', ' ')}"
    if re.match(r"public domain|^PD\b|^PD-", s, re.I):
        return "Public domain"
    return None


def commons_candidate(page: dict, retrieved: str, tags: set[str]) -> dict | None:
    ii = (page.get("imageinfo") or [None])[0]
    if not ii or ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
        return None
    em = ii.get("extmetadata") or {}
    lic = commons_license((em.get("LicenseShortName") or {}).get("value"))
    if not lic:
        return None
    artist_html = (em.get("Artist") or {}).get("value") or ""
    author = clean_author(strip_html(artist_html)) or ii.get("user") or "unknown"
    href = re.search(r'href="([^"]+)"', artist_html)
    author_url = ("https:" + href.group(1) if href and href.group(1).startswith("//") else href.group(1) if href else None)
    cats = [c["title"].removeprefix("Category:") for c in page.get("categories", [])]
    tags = set(tags)
    if "Quality images" in cats:
        tags.add("qi")
    if any(c.startswith("Featured pictures on Wikimedia Commons") for c in cats):
        tags.add("fp")
    roles = []
    joined = " | ".join(cats)
    for pattern, role in ((r"\bmales?\b", "male"), (r"\bfemales?\b", "female"),
                          (r"juvenile|\bchicks?\b|\byoung\b|\bcubs?\b|\bcalves\b|\bcalf\b", "juvenile"),
                          (r"in flight|flying", "in_flight")):
        if re.search(pattern, joined, re.I) and not (role == "male" and re.search(r"\bfemales?\b", joined, re.I)
                                                     and not re.search(r"(^|[^e])\bmales?\b", joined, re.I)):
            roles.append(role)
    # Commons Quality/Featured photos are sharp but often zoo shots; a wild iNat photo with a few faves beats them.
    score = 0.3 + (1.6 if "fp" in tags else 0) + (1.2 if "qi" in tags and "fp" not in tags else 0)
    score += 1.0 if "p18" in tags else 0
    score -= 0.3 if ZOO.search(joined + " " + page["title"]) else 0
    title = page["title"]
    return {
        "id": f"commons-{page['pageid']}",
        "source": "commons",
        "source_url": ii.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
        "page_url": ii.get("descriptionurl"),
        "original_url": ii.get("url"),
        "download_url": ii.get("thumburl") if (ii.get("thumbwidth") or 0) < (ii.get("width") or 0) else ii.get("url"),
        "author": author[:200],
        "author_url": author_url,
        "observer": f"commons:{author.lower()}",
        "license": lic,
        "license_url": (em.get("LicenseUrl") or {}).get("value") or None,
        "attribution_text": None,
        "orig_w": ii.get("width"),
        "orig_h": ii.get("height"),
        "role": roles,
        "role_source": "commons_category" if roles else None,
        "retrieved": retrieved,
        "quality": {"commons_qi": "qi" in tags, "commons_fp": "fp" in tags, "p18": "p18" in tags},
        "title": title,
        "categories": cats,
        "base_score": score,
    }


def name_ok(cand: dict, names: list[str]) -> bool:
    hay = (cand["title"] + " | " + " | ".join(cand["categories"])).lower().replace("_", " ")
    return any(n.lower() in hay for n in names if n)


def commons_candidates(api: Api, binomial: str, wd: dict, retrieved: str, broad: bool) -> list[dict]:
    names = [binomial, wd.get("p373")]
    cat = (wd.get("p373") or binomial).replace(" ", "_")
    out: dict[str, dict] = {}

    if wd.get("p18"):
        for p in commons_pages(api, {"titles": "|".join(wd["p18"][:5])}):
            c = commons_candidate(p, retrieved, {"p18"}) if "missing" not in p else None
            if c:
                out[c["id"]] = c

    queries = [f'deepcat:"{cat}" incategory:"Quality_images|Featured_pictures_on_Wikimedia_Commons" filetype:bitmap']
    if broad:
        queries.append(f'deepcat:"{cat}" filetype:bitmap')
    for q in queries:
        limit = 50 if "Quality_images" not in q else 20
        pages = commons_pages(api, {"generator": "search", "gsrnamespace": 6, "gsrlimit": limit, "gsrsearch": q})
        if not pages:  # deepcat refuses very large trees; fall back to the category itself
            pages = commons_pages(api, {"generator": "search", "gsrnamespace": 6, "gsrlimit": limit,
                                        "gsrsearch": q.replace("deepcat:", "incategory:")})
        for p in pages:
            c = commons_candidate(p, retrieved, set())
            if c and c["id"] not in out and name_ok(c, names):
                out[c["id"]] = c
    return list(out.values())


def commons_pin(api: Api, ref: str, retrieved: str) -> dict | None:
    m = re.search(r"(File:[^?#]+)", urllib.parse.unquote(ref))
    if not m:
        return None
    pages = commons_pages(api, {"titles": m.group(1).replace("_", " ")})
    return commons_candidate(pages[0], retrieved, set()) if pages and "missing" not in pages[0] else None


def inat_pin(api: Api, ref: str, retrieved: str) -> dict | None:
    m = re.search(r"inaturalist\.org/observations/(\d+)", ref)
    if not m:
        return None
    d = api.get(f"https://api.inaturalist.org/v1/observations/{m.group(1)}")
    obs = ((d or {}).get("results") or [None])[0]
    if not obs:
        return None
    fake = {"results": [{**obs, "captive": False}]}
    tmp = Api.__new__(Api)
    tmp.get = lambda *a, **k: fake  # reuse the candidate builder on this one observation
    found = inat_candidates(tmp, 0, retrieved)
    return found[0] if found else None


# ---------------------------------------------------------------- ranking

def final_score(c: dict) -> float:
    s = c["base_score"]
    w, h = c.get("orig_w") or 0, c.get("orig_h") or 0
    if not w or not h:
        return s - 3
    r, short = w / h, min(w, h)
    s += 0.6 if 1.0 <= r <= 1.8 else 0.2 if 0.8 <= r <= 2.0 else -2.5
    s += 0.2 if short >= 1200 else 0 if short >= 800 else -2.5
    return s


def rejected(c: dict, relaxed: bool) -> bool:
    if c["source"] != "commons":
        return False
    pattern = REJECT_RELAXED if relaxed else REJECT
    return bool(pattern.search(c["title"] + " | " + " | ".join(c["categories"])))


def observer_of(c: dict) -> str:
    """Who took the photo, for candidates (which carry it) and manifest records (which don't)."""
    if c.get("observer"):
        return c["observer"]
    if c["source"] == "inaturalist" and (c.get("author_url") or "").startswith("https://www.inaturalist.org/people/"):
        return "inat:" + c["author_url"].rsplit("/", 1)[1]
    return f"{'inat' if c['source'] == 'inaturalist' else 'commons'}:{(c.get('author') or '').lower()}"


def choose(cands: list[dict], pinned: list[dict], n: int = PHOTOS_PER_SPECIES, minimum: int = MIN_PHOTOS,
           avoid_observers: frozenset = frozenset()) -> list[dict]:
    """The n best candidates after the pinned ones, one per observer while possible (and none of
    avoid_observers on the first pass); candidates scoring below 0 only to reach `minimum`."""
    chosen = list(pinned)[:n]
    pool = [c for c in cands if c["id"] not in {p["id"] for p in chosen}]
    for c in pool:
        c["score"] = round(final_score(c), 3)
    pool.sort(key=lambda c: -c["score"])
    for allow_repeat_observer, floor in ((False, 0.0), (True, 0.0), (True, -99)):
        while len(chosen) < n:
            if floor < -1 and len(chosen) >= minimum:
                break
            used_obs = {c["observer"] for c in chosen} | (avoid_observers if not allow_repeat_observer else set())
            used_roles = {r for c in chosen for r in c["role"]}
            best, best_s = None, None
            for c in pool:
                if c in chosen or c["score"] < floor:
                    continue
                if not allow_repeat_observer and c["observer"] in used_obs:
                    continue
                s = c["score"] + (0.4 if {"male", "female"} & (set(c["role"]) - used_roles) else 0)
                if best_s is None or s > best_s:
                    best, best_s = c, s
            if not best:
                break
            chosen.append(best)
    return chosen


MANIFEST_FIELDS = ["id", "species_id", "file", "w", "h", "author", "author_url", "license", "license_url",
                   "source", "source_url", "page_url", "original_url", "download_url", "attribution_text",
                   "retrieved", "role", "role_source", "orig_w", "orig_h", "quality", "score", "selection",
                   "modified", "crop", "title", "set", "trim"]


def cmd_select(repo: pathlib.Path, only: list[str] | None = None, refresh: bool = False,
               exam_only: bool = False) -> None:
    p = paths(repo)
    api = Api(p["cache"], refresh)
    retrieved = dt.date.today().isoformat()
    species = load_species(repo)
    if only:
        species = [s for s in species if s[0] in only]
    overrides = load_overrides(repo)
    old = json.loads(p["manifest"].read_text()) if p["manifest"].exists() else {}
    old_records = {r["id"]: r for r in old.get("records", [])}
    keep = {sid: [r for r in old.get("records", []) if r["species_id"] == sid] for sid, _ in load_species(repo)}
    notes = dict(old.get("species_notes", {}))
    duplicates = old.get("duplicates", {})

    wd = wikidata_items(api, [b for _, b in species])
    all_candidates = {}
    for i, (sid, binomial) in enumerate(species):
        rows = [o for o in overrides if o["species_id"].strip() == sid]
        excludes = [o["media_id_or_url"] for o in rows if o["action"] == "exclude"] + duplicates.get(sid, [])
        sp_notes = []
        taxon_id, how = inat_taxon(api, binomial)
        if how != "exact":
            sp_notes.append(f"iNaturalist: {how}")
        cands = inat_candidates(api, taxon_id, retrieved) if taxon_id else []
        w = wd.get(binomial, {})
        if not w:
            sp_notes.append("no Wikidata item under this name")
        good_inat = sum(1 for c in cands if final_score(c) > 0)
        cands += commons_candidates(api, binomial, w, retrieved, broad=good_inat < PHOTOS_PER_SPECIES + EXAM_PHOTOS + 2)
        for o in rows:
            if o["action"] == "exclude" and not any(matches(c, o["media_id_or_url"]) for c in cands):
                sp_notes.append(f"exclude matched no candidate: {o['media_id_or_url']}")
        cands = [c for c in cands if not any(matches(c, e) for e in excludes)]
        strict = [c for c in cands if not rejected(c, relaxed=False)]
        if sum(1 for c in strict if final_score(c) > -1) < MIN_PHOTOS:
            relaxed = [c for c in cands if not rejected(c, relaxed=True)]
            if len(relaxed) > len(strict):
                sp_notes.append("few candidates: museum/archival Commons files allowed")
            strict = relaxed
        def pins(action: str) -> list[dict]:
            out = []
            for o in rows:
                if o["action"] != action:
                    continue
                ref = o["media_id_or_url"]
                hit = next((c for c in cands if matches(c, ref)), None) or old_records.get(ref.strip())
                hit = hit or commons_pin(api, ref, retrieved) or inat_pin(api, ref, retrieved)
                if hit:
                    out.append({**hit, "selection": "manual"})
                else:
                    sp_notes.append(f"{action} not found: {ref}")
            return out

        if exam_only:
            practice = [dict(r) for r in keep.get(sid, []) if r.get("set", "practice") == "practice"]
        else:
            practice = choose(strict, pins("pin"))
        for c in practice:
            c["set"] = "practice"
        # Exam photos: never a practice photo or another photo of the same observation; other observers first.
        taken = {c["id"] for c in practice} | {c.get("page_url") for c in practice if c["source"] == "inaturalist"}
        exam_pool = [c for c in strict if c["id"] not in taken and c.get("page_url") not in taken]
        exam_pins = [c for c in pins("exam") if c["id"] not in taken]
        exam = choose(exam_pool, exam_pins, EXAM_PHOTOS, EXAM_PHOTOS, frozenset(map(observer_of, practice)))
        for c in exam:
            c["set"] = "exam"
        if len(exam) < EXAM_PHOTOS:
            sp_notes.append(f"only {len(exam)} exam photo(s)")
        chosen = practice + exam
        for c in chosen:
            c.setdefault("selection", "auto")
            if "score" not in c:
                c["score"] = round(final_score(c), 3)
            c["species_id"] = sid
            c["crop"] = c["trim"] = None
            prev = old_records.get(c["id"])
            if prev and prev.get("file"):
                c.update({k: prev[k] for k in ("file", "w", "h")})
            for o in rows:
                if o["action"] in ("crop", "trim") and matches(c, o["media_id_or_url"]):
                    c[o["action"]] = [float(x) for x in o["value"].split(",")]
            c["modified"] = "cropped and resized" if c["trim"] else "resized"
        keep[sid] = [{k: c.get(k) for k in MANIFEST_FIELDS} for c in chosen]
        notes[sid] = sp_notes
        all_candidates[sid] = sorted(({k: c.get(k) for k in ("id", "source", "source_url", "score", "base_score",
                                                              "orig_w", "orig_h", "author", "title")} for c in strict),
                                     key=lambda c: -(c["score"] if c["score"] is not None else -99))
        print(f"{i + 1}/{len(species)} {binomial}: {len(practice)} + {len(exam)} exam chosen from {len(strict)} "
              f"({sum(c['source'] == 'inaturalist' for c in chosen)} iNat) {'; '.join(sp_notes)}", flush=True)

    order = [sid for sid, _ in load_species(repo)]
    manifest = {
        "generated": retrieved,
        "note": "Generated by pipeline/media.py select. Edit curation/media_overrides.csv, not this file.",
        "species_notes": {sid: notes.get(sid, []) for sid in order},
        "duplicates": duplicates,
        "records": [r for sid in order for r in keep.get(sid, [])],
    }
    p["manifest"].parent.mkdir(parents=True, exist_ok=True)
    p["manifest"].write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (p["cache"] / "candidates.json").write_text(json.dumps(all_candidates, indent=1, ensure_ascii=False))
    print(f"wrote {p['manifest']} ({len(manifest['records'])} photos)")


# ---------------------------------------------------------------- fetch + render

def opaque_name(media_id: str) -> str:
    return hashlib.sha1(("visu-media:" + media_id).encode()).hexdigest()[:12] + ".jpg"


def render_image(src: bytes, dest: pathlib.Path, max_side: int, trim: list[float] | None = None) -> tuple[int, int]:
    """Re-encode src as a clean JPEG no larger than max_side; trim = [x, y, w, h] fractions cuts the picture first."""
    from PIL import Image, ImageCms, ImageOps

    im = Image.open(io.BytesIO(src))
    im = ImageOps.exif_transpose(im)
    if trim:
        x, y, w, h = trim
        im = im.crop((round(x * im.width), round(y * im.height), round((x + w) * im.width), round((y + h) * im.height)))
    icc = im.info.get("icc_profile")
    if im.mode in ("P", "PA", "LA", "RGBA", "I;16", "I", "F", "1", "L"):
        im = im.convert("RGBA" if "A" in im.mode or im.mode == "P" else "RGB")
    if im.mode == "RGBA":
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.getchannel("A"))
        im = bg
    if icc:
        try:
            src_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src_profile, ImageCms.createProfile("sRGB"),
                                           outputMode="RGB", renderingIntent=ImageCms.Intent.PERCEPTUAL)
        except (ImageCms.PyCMSError, OSError, ValueError):
            pass
    im = im.convert("RGB")
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    clean = Image.new("RGB", im.size)  # fresh image: no EXIF, GPS, XMP or ICC carried over
    clean.paste(im)
    dest.parent.mkdir(parents=True, exist_ok=True)
    clean.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return clean.size


def dhash(path: pathlib.Path) -> int:
    from PIL import Image
    with Image.open(path) as im:
        px = list(im.convert("L").resize((9, 8), Image.Resampling.LANCZOS).tobytes())
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def is_monochrome(path: pathlib.Path) -> bool:
    from PIL import Image
    with Image.open(path) as im:
        sat = im.convert("HSV").getchannel("S").resize((64, 64))
        return sum(sat.tobytes()) / 4096 < 1.5


def find_duplicates(repo: pathlib.Path, recs: list[dict]) -> list[dict]:
    """Photos to drop after rendering: lower-ranked near-copies of an earlier photo of the species
    (difference hash within 10 bits) and monochrome iNat photos, which are infrared camera-trap frames.
    Commons is exempt from the monochrome rule because archival photos (Thylacinus) are black and white."""
    seen: dict[str, list[int]] = {}
    out = []
    for r in recs:
        if not r.get("file"):
            continue
        if r["source"] == "inaturalist" and is_monochrome(repo / r["file"]):
            out.append(r)
            continue
        h = dhash(repo / r["file"])
        if any(bin(h ^ o).count("1") <= 10 for o in seen.get(r["species_id"], [])):
            out.append(r)
        else:
            seen.setdefault(r["species_id"], []).append(h)
    return out


def cmd_fetch(repo: pathlib.Path, max_side: int = MAX_SIDE, rerender: bool = False) -> None:
    p = paths(repo)
    manifest = json.loads(p["manifest"].read_text())
    orig_dir = p["cache"] / "originals"
    orig_dir.mkdir(parents=True, exist_ok=True)
    failures = []

    def work(rec: dict) -> None:
        # A trimmed photo gets its own file name, so changing the trim renders it again.
        name = opaque_name(rec["id"] + (f"#trim={rec['trim']}" if rec.get("trim") else ""))
        file_rel = f"media/{rec['species_id']}/{name}"
        dest = repo / file_rel
        if dest.exists() and rec.get("file") == file_rel and rec.get("w") and not rerender:
            return
        url = rec.get("download_url") or rec["original_url"]
        cached = orig_dir / (rec["id"] + ".bin")
        try:
            if not cached.exists():
                data = http_get(url)
                cached.write_bytes(data)
            w, h = render_image(cached.read_bytes(), dest, max_side, rec.get("trim"))
        except Exception as e:  # noqa: BLE001 - report and continue with the other photos
            failures.append((rec["id"], url, repr(e)))
            rec["file"] = None
            return
        rec.update({"file": file_rel, "w": w, "h": h})

    recs = manifest["records"]
    with ThreadPoolExecutor(4) as ex:
        for i, _ in enumerate(ex.map(work, recs)):
            if i % 50 == 0:
                print(f"fetch {i}/{len(recs)}", flush=True)
    dupes = find_duplicates(repo, recs)
    if dupes:
        for r in dupes:
            manifest.setdefault("duplicates", {}).setdefault(r["species_id"], []).append(r["id"])
        print(f"{len(dupes)} near-duplicate or monochrome camera-trap photos dropped; "
              "re-run select and fetch to refill")
    recs = [r for r in recs if r not in dupes]
    manifest["records"] = recs
    p["manifest"].write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")

    # Remove files no longer in the manifest (including the old stubs) and empty species folders.
    wanted = {repo / r["file"] for r in recs if r.get("file")}
    known = {sid for sid, _ in load_species(repo)}
    for d in p["media"].iterdir():
        if d.is_dir() and d.name in known:
            for f in d.iterdir():
                if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") and f not in wanted:
                    f.unlink()
            if not any(d.iterdir()):
                d.rmdir()
    total = sum(f.stat().st_size for f in wanted if f.exists()) / 1e6
    print(f"rendered {len(wanted)} photos, {total:.1f} MB; {len(failures)} failures")
    for f in failures:
        print("  FAILED", *f)
    if total > BUDGET_MB:
        print(f"WARNING: over the {BUDGET_MB} MB budget; re-run with --max-side 1000 --rerender")


# ---------------------------------------------------------------- emit

CONTRACT_FIELDS = ["id", "file", "w", "h", "author", "license", "license_url", "source", "source_url", "modified", "crop",
                   "set"]


URL_FIELDS = ("license_url", "source_url")


def photo_set(r: dict) -> str:
    """"practice" or "exam"; records selected before 2026-11-13 have no set and are practice photos."""
    return r.get("set") or "practice"


def render(repo_root: pathlib.Path, species: list[tuple[str, str]] | None = None) -> str:
    """The text of one collection's data/<id>/media.js from curation/media_manifest.json, in the shape
    docs/data-format.md specifies.

    Raises BuildError when fewer than half of a list of 20 or more species have photos: that is a
    misread list or a new list whose photos weren't selected yet, and writing it would publish a
    collection without photos.
    """
    p = paths(pathlib.Path(repo_root))
    manifest = json.loads(p["manifest"].read_text(encoding="utf-8"))
    if species is None:
        species = load_species(pathlib.Path(repo_root))
    media: dict[str, list] = {sid: [] for sid, _ in species}
    with_photos = {r["species_id"] for r in manifest["records"] if r.get("file")}
    matched = with_photos & set(media)
    if len(media) >= 20 and len(matched) < MIN_MATCHED_SHARE * len(media):
        raise BuildError(
            f"media: solo {len(matched)} de las {len(media)} especies de la lista tienen foto en "
            f"curation/media_manifest.json; no se escribe media.js. "
            f"(Only {len(matched)} of the list's {len(media)} species have photos; media.js was not written. "
            f"Run `pipeline/media.py select` and `fetch` for the new species first.)")
    for r in manifest["records"]:
        if r.get("file") and r["species_id"] in media:
            for k in URL_FIELDS:
                check_url(r.get(k), f"curation/media_manifest.json {r['id']}, {k}")
            media[r["species_id"]].append({**{k: r.get(k) for k in CONTRACT_FIELDS}, "set": photo_set(r)})
    body = json.dumps(media, ensure_ascii=False, separators=(",", ":"))
    return ("// Generated by pipeline/media.py from curation/media_manifest.json. Do not edit by hand.\n"
            "window.VISU = window.VISU || {};\n"
            f"VISU.media = {body};\n")


def emit(repo_root: pathlib.Path) -> None:
    """Write data/<id>/media.js for every collection (see render)."""
    p = paths(pathlib.Path(repo_root))
    write_all({p["data"] / c["id"] / "media.js": render(repo_root, [(s["id"], s["binomial"]) for s in c["species"]])
               for c in load_collections(p["collections"])})


# ---------------------------------------------------------------- report + credits

def md_escape(s: str | None) -> str:
    return (s or "").replace("|", "\\|").replace("\n", " ")


def write_credits(repo: pathlib.Path, manifest: dict) -> None:
    p = paths(repo)
    names = dict(load_species(repo))
    lines = ["# Photo credits", "",
             "Generated by `pipeline/media.py report`. Every photo in `media/` is listed here with its author, licence",
             "and source. All photos were **modified: resized and re-encoded** (longest side "
             f"{MAX_SIDE} px, JPEG, metadata removed). Photos under CC BY-SA keep that licence.", "",
             "Media ids (first column) are what `curation/media_overrides.csv` uses. Photos marked *mock exam only*",
             "are held out of practice and shown only in the mock exam.", ""]
    by_sp: dict[str, list] = {}
    for r in manifest["records"]:
        if r.get("file"):
            by_sp.setdefault(r["species_id"], []).append(r)
    for sid, binomial in load_species(repo):
        recs = by_sp.get(sid)
        if not recs:
            continue
        lines += [f"## *{binomial}*", "", "| Media id | File | Used in | Author | Licence | Source |",
                  "|---|---|---|---|---|---|"]
        for r in recs:
            author = f"[{md_escape(r['author'])}]({r['author_url']})" if r.get("author_url") else md_escape(r["author"])
            lic = f"[{r['license']}]({r['license_url']})" if r.get("license_url") else r["license"]
            src = "iNaturalist" if r["source"] == "inaturalist" else "Wikimedia Commons"
            used = "mock exam only" if photo_set(r) == "exam" else "practice"
            lines.append(f"| `{r['id']}` | `{r['file'].split('/')[-1]}` | {used} | {author} | {lic}, modified: {r.get('modified') or 'resized'} "
                         f"| [{src}]({r['source_url']}) |")
        lines.append("")
    p["credits"].write_text("\n".join(lines), encoding="utf-8")


EXAM_WANTED = "reports/exam-photos-wanted.csv"


def write_exam_wanted(repo: pathlib.Path, few_exam: list[tuple[str, str, int]], manifest: dict) -> None:
    """The species still short of exam photos, as a CSV a person can work through. A photo found for one
    goes into curation/media_overrides.csv as `<species_id>,exam,<Commons File: URL or iNat observation URL>,`."""
    import csv
    common = {s["id"]: s.get("common_es", "") for s in all_species(paths(repo)["collections"])}
    with (repo / EXAM_WANTED).open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["species_id", "nombre_cientifico", "nombre_vulgar", "exam_photos", "wanted", "notes"])
        for sid, binomial, n in few_exam:
            notes = [x for x in manifest.get("species_notes", {}).get(sid, [])
                     if not x.startswith(("exclude matched no candidate", "only "))]
            w.writerow([sid, binomial, common.get(sid, ""), n, EXAM_PHOTOS - n, "; ".join(
                ["searched iNaturalist and Wikimedia Commons; the remaining candidates were rejected by eye "
                 "(see curation/media_overrides.csv)"] + notes)])


def cmd_report(repo: pathlib.Path) -> None:
    p = paths(repo)
    manifest = json.loads(p["manifest"].read_text(encoding="utf-8"))
    species = load_species(repo)
    recs = [r for r in manifest["records"] if r.get("file")]
    per: dict[str, list] = {sid: [] for sid, _ in species}
    for r in recs:
        per.setdefault(r["species_id"], []).append(r)
    lic: dict[str, int] = {}
    src: dict[str, int] = {}
    for r in recs:
        lic[r["license"]] = lic.get(r["license"], 0) + 1
        src[r["source"]] = src.get(r["source"], 0) + 1
    total = sum((repo / r["file"]).stat().st_size for r in recs if (repo / r["file"]).exists())
    practice = {sid: [r for r in v if photo_set(r) == "practice"] for sid, v in per.items()}
    exam = {sid: [r for r in v if photo_set(r) == "exam"] for sid, v in per.items()}
    counts = sorted(len(practice[sid]) for sid, _ in species)
    median = counts[len(counts) // 2] if counts else 0
    few = [(sid, b, len(practice[sid])) for sid, b in species if len(practice[sid]) < MIN_PHOTOS]
    few_exam = [(sid, b, len(exam[sid])) for sid, b in species if len(exam[sid]) < EXAM_PHOTOS]
    write_exam_wanted(repo, few_exam, manifest)
    extreme = []
    for sid, b in species:
        bad = [r for r in per[sid] if r.get("w") and r.get("h") and (r["w"] / r["h"] < 0.8 or r["w"] / r["h"] > 2.0)]
        if bad:
            extreme.append((b, ", ".join(f"`{r['id']}` {r['w']}×{r['h']}" for r in bad)))
    overrides = load_overrides(repo)
    lines = [
        "# Media report", "",
        f"Generated by `pipeline/media.py report` on {dt.date.today().isoformat()} from "
        f"`curation/media_manifest.json` (selected {manifest.get('generated')}).", "",
        "## Summary", "",
        f"- Species: {len(species)}; photos: {len(recs)}; total size: {total / 1e6:.1f} MB "
        f"(budget {BUDGET_MB} MB).",
        f"- Practice photos per species: min {counts[0] if counts else 0}, median {median}, max {counts[-1] if counts else 0}.",
        f"- Exam photos (shown only in the mock exam): {sum(len(v) for v in exam.values())}; "
        f"species with {EXAM_PHOTOS} or more: {sum(len(exam[sid]) >= EXAM_PHOTOS for sid, _ in species)} of {len(species)}.",
        f"- Sources: " + ", ".join(f"{k} {v}" for k, v in sorted(src.items())) + ".",
        f"- Overrides applied: " + ", ".join(f"{a} {sum(o['action'] == a for o in overrides)}"
                                             for a in ("pin", "exam", "exclude", "crop", "trim")) + ".", "",
        "## Licences", "", "| Licence | Photos |", "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(lic.items(), key=lambda kv: -kv[1])], "",
        f"## Species with fewer than {MIN_PHOTOS} practice photos ({len(few)})", "",
        *([f"- *{b}* (`{sid}`): {n}" for sid, b, n in few] or ["None."]), "",
        f"## Species with fewer than {EXAM_PHOTOS} exam photos ({len(few_exam)})", "",
        f"Also in `{EXAM_WANTED}`, for whoever looks for more photos.", "",
        *([f"- *{b}* (`{sid}`): {n}" for sid, b, n in few_exam] or ["None."]), "",
        f"## Species with an extreme aspect ratio (taller than 4:5 or wider than 2:1) ({len(extreme)})", "",
        *([f"- *{b}*: {d}" for b, d in extreme] or ["None."]), "",
        "## Name-resolution and selection notes", "",
        *([f"- *{b}*: {'; '.join(manifest['species_notes'][sid])}" for sid, b in species
           if manifest.get("species_notes", {}).get(sid)] or ["None."]), "",
    ]
    p["report"].parent.mkdir(parents=True, exist_ok=True)
    p["report"].write_text("\n".join(lines), encoding="utf-8")
    write_credits(repo, manifest)
    print("\n".join(lines[:12]))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("select")
    s.add_argument("--only", nargs="*", help="species ids to (re)select; others keep their manifest records")
    s.add_argument("--refresh", action="store_true", help="ignore the API cache in .cache/media/api")
    s.add_argument("--exam-only", action="store_true",
                   help="keep each species' practice photos as they are; (re)choose only its exam photos")
    f = sub.add_parser("fetch")
    f.add_argument("--max-side", type=int, default=MAX_SIDE)
    f.add_argument("--rerender", action="store_true")
    sub.add_parser("emit")
    sub.add_parser("report")
    a = ap.parse_args(argv)
    try:
        run(a)
    except BuildError as e:
        sys.exit(f"ERROR: {e}")


def run(a: argparse.Namespace) -> None:
    if a.cmd == "select":
        cmd_select(REPO, a.only, a.refresh, a.exam_only)
    elif a.cmd == "fetch":
        cmd_fetch(REPO, a.max_side, a.rerender)
    elif a.cmd == "emit":
        emit(REPO)
        print(f"wrote {paths(REPO)['data']}/<collection>/media.js")
    else:
        cmd_report(REPO)


if __name__ == "__main__":
    main()
