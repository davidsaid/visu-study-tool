"""Animal Diversity Web: the "Sexual Dimorphism" keywords of each species account (nothing else).

ADW is HTML only (no API; its search is disallowed by robots.txt), so refresh.py fetches one account
page per species, at most one request every 8 s (robots.txt "Crawl-delay: 8"), cached in
.cache/http-adw/ (one JSON per page, kept until deleted). Licence: CC BY-NC-SA 3.0
(https://animaldiversity.org/about/use_conditions/), adaptable under 4.0. Only full accounts count:
a missing species redirects to a classification-only page, which has no keywords.
"""
import json
import re
import time
import urllib.error
import urllib.request

BASE = "https://animaldiversity.org/accounts/"
DELAY = 8.0
DIMORPHISM = re.compile(r'<li class="keywords-header">\s*Sexual Dimorphism\s*</li>(.*?)</ul>', re.S)
ITEM = re.compile(r"<span>\s*([^<]+?)\s*</span>")
_last = [0.0]


def fetch(url, cache, user_agent):
    path = cache / (re.sub(r"[^A-Za-z0-9_.-]", "_", url.replace(BASE, "")) + ".json")
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    wait = DELAY - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": user_agent}), timeout=60) as r:
            rec = {"url": url, "status": r.status, "final_url": r.geturl(), "html": r.read().decode("utf-8", "replace")}
    except urllib.error.HTTPError as e:
        rec = {"url": url, "status": e.code, "final_url": url, "html": ""}
    except (urllib.error.URLError, TimeoutError) as e:
        return {"url": url, "status": "unreachable", "final_url": url, "html": "", "error": str(e)}   # not cached
    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rec), encoding="utf-8")
    return rec


def dimorphism(html):
    m = DIMORPHISM.search(html or "")
    return [" ".join(x.split()) for x in ITEM.findall(m.group(1))] if m else []


def extract(species, names, cache, user_agent, log=print):
    """{binomial: {"name", "via", "v": {"dimorphism": [...], "url"}}}: the listed name first, then GBIF's
    accepted name when it differs."""
    out = {}
    for i, s in enumerate(species, 1):
        b = s["binomial"]
        tries = [(b, "exact")]
        acc = " ".join(((names.get(b) or {}).get("accepted") or "").split()[:2])
        if acc and acc != b:
            tries.append((acc, "synonym"))
        for name, via in tries:
            rec = fetch(BASE + name.replace(" ", "_") + "/", cache, user_agent)
            kw = dimorphism(rec.get("html")) if rec.get("status") == 200 else []
            if kw:
                out[b] = {"name": name, "via": via, "v": {"dimorphism": kw, "url": rec["final_url"]}}
                break
        if i % 50 == 0:
            log(f"  adw {i}/{len(species)}")
    return out
