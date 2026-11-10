"""Shared by refresh.py, build.py and media.py: paths, CSV reading, the collection parsers and atomic writes.

The parsers fail loudly (BuildError) on anything a maintainer must fix, and name the row
and the column so the message is actionable without reading code.
"""
import csv
import io
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / "pipeline"
SNAPSHOT = PIPELINE / "snapshot"
CACHE = ROOT / ".cache"
COLLECTIONS = ROOT / "collections"
CURATION = ROOT / "curation"

SPECIES_COLUMNS = ["clase", "orden", "infraorden", "nombre_cientifico", "nombre_vulgar"]
SPECIES_REQUIRED = ["clase", "orden", "nombre_cientifico", "nombre_vulgar"]
VIDEO_COLUMNS = ["species_id", "url", "channel", "channel_url", "title", "checked"]
CHANGE_COLUMNS = ["fecha", "nombre_cientifico", "campo", "antes", "ahora"]
CHANGE_FIELDS = {"clase": "class", "orden": "order", "infraorden": "infraorder", "nombre_vulgar": "common_es"}
COLLECTION_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")


class BuildError(Exception):
    """A condition that must stop the build. The message says what to fix and where."""


def species_id(binomial):
    return "_".join(binomial.lower().split())


def rel(path):
    """The path as shown in messages: relative to the repo when inside it."""
    path = Path(path)
    return path.relative_to(ROOT) if path.is_relative_to(ROOT) else path


def decode(raw, path):
    """UTF-8, with or without a BOM. Anything else stops the build with a message a maintainer can act on."""
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError as e:
        line = raw[:e.start].count(b"\n") + 1
        try:
            sample = raw.decode("cp1252").splitlines()[line - 1].strip()[:60]
            hint = (f" La fila {line} parece estar en Windows-1252 / ANSI: «{sample}» "
                    f"(row {line} looks like Windows-1252 / ANSI).")
        except (UnicodeDecodeError, IndexError):
            hint = ""
        raise BuildError(
            f"{rel(path)}: el archivo no está en UTF-8.{hint} En Excel, usa «Guardar como» → "
            f"«CSV UTF-8 (delimitado por comas)». "
            f"(The file is not UTF-8. In Excel, use Save As → \"CSV UTF-8 (Comma delimited)\".)")


def check_url(url, where):
    """Only http(s) links reach the site; javascript:, data: and the like stop the build."""
    if url and not re.match(r"https?://[^\s/]", url, re.I):
        raise BuildError(f"{where}: el enlace '{url[:80]}' no empieza por http:// o https:// "
                         f"(the link must start with http:// or https://)")
    return url


def read_csv(path, required_columns, comment=None):
    """Read a collection or curation CSV into a list of dicts. Every CSV the pipeline reads goes through here.

    Accepts ',' or ';' (Excel in a Spanish locale saves with ';'), UTF-8 with or without a BOM.
    Every row must have exactly as many fields as the header: an unquoted comma inside a name
    would otherwise shift the columns silently. Values are stripped. Row numbers in errors are
    the line numbers a spreadsheet shows (header = 1). Lines starting with `comment` are skipped.
    """
    path = Path(path)
    if not path.exists():
        raise BuildError(f"{rel(path)}: file not found")
    text = decode(path.read_bytes(), path)
    if comment:
        # Blank the comment lines instead of dropping them, so row numbers still match the file.
        text = "\n".join("" if ln.lstrip().startswith(comment) else ln for ln in text.splitlines())
    lines = [ln for ln in text.splitlines() if ln.strip()]
    first = lines[0] if lines else ""
    delimiter = ";" if first.count(";") > first.count(",") else ","
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    header = None
    rows = []
    for fields in reader:
        if not any(f.strip() for f in fields):
            continue
        if header is None:
            header = [h.strip() for h in fields]
            named = [h for h in header if h]
            dupes = sorted({h for h in named if named.count(h) > 1})
            if dupes:
                raise BuildError(f"{rel(path)}: columna repetida en la cabecera {dupes} (duplicate header column)")
            missing = [c for c in required_columns if c not in header]
            if missing:
                raise BuildError(f"{rel(path)}: missing column(s) {missing}; found {header}")
            continue
        line = reader.line_num
        if len(fields) != len(header):
            raise BuildError(
                f"{rel(path)}: fila {line}: tiene {len(fields)} columnas y la cabecera {len(header)}. "
                f"Si un nombre lleva una coma (o un punto y coma), ponlo entre comillas. "
                f"(row {line} has {len(fields)} fields but the header has {len(header)}; "
                f"put a value that contains the separator in double quotes.)")
        row = {h: v.strip() for h, v in zip(header, fields) if h}
        row["_line"] = line
        rows.append(row)
    if header is None:
        raise BuildError(f"{rel(path)}: el archivo está vacío (the file is empty)")
    return rows


def parse_species(path):
    """Parse and validate a collection's species list. Returns a list of species dicts in file order."""
    rows = read_csv(path, SPECIES_COLUMNS)
    errors, seen, species = [], {}, []
    for r in rows:
        where = f"fila {r['_line']} (row {r['_line']})"
        for col in SPECIES_REQUIRED:
            if not r.get(col):
                errors.append(f"{where}: la columna '{col}' está vacía (column '{col}' is empty)")
        binomial = " ".join(r.get("nombre_cientifico", "").split())
        parts = binomial.split(" ")
        if binomial and (len(parts) != 2 or not parts[0][:1].isupper() or not parts[1].islower()):
            errors.append(f"{where}: '{binomial}' no es un binomio 'Género especie' (not a 'Genus species' binomial)")
            continue
        if not binomial:
            continue
        sid = species_id(binomial)
        if sid in seen:
            errors.append(f"{where}: '{binomial}' está repetido; ya aparece en la fila {seen[sid]} "
                          f"(duplicate binomial, first at row {seen[sid]})")
            continue
        seen[sid] = r["_line"]
        species.append({
            "id": sid, "binomial": binomial, "genus": parts[0], "epithet": parts[1],
            "class": r.get("clase", ""), "order": r.get("orden", ""),
            "infraorder": r.get("infraorden") or None, "common_es": r.get("nombre_vulgar", ""),
            "line": r["_line"],
        })
    if not species and not errors:
        errors.append("la lista no tiene especies (the list has no species)")
    if errors:
        raise BuildError(f"{rel(path)}: {len(errors)} error(es):\n  " + "\n  ".join(errors))
    return species


def parse_videos(path, ids):
    """A collection's videos.csv: {species_id: video record}. Optional file; one video per species."""
    if not Path(path).exists():
        return {}
    out = {}
    for r in read_csv(path, VIDEO_COLUMNS):
        where = f"{rel(path)} row {r['_line']}"
        if r["species_id"] not in ids:
            raise BuildError(f"{where}: species '{r['species_id']}' is not in this collection's species.csv")
        if r["species_id"] in out:
            raise BuildError(f"{where}: species '{r['species_id']}' already has a video")
        if not r["url"]:
            continue
        if not (r["channel"] and r["channel_url"]):
            raise BuildError(f"{where}: every video needs its channel and channel_url, to credit its author")
        check_url(r["url"], f"{where}, url")
        check_url(r["channel_url"], f"{where}, channel_url")
        if r["checked"] and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["checked"]):
            raise BuildError(f"{where}: checked '{r['checked']}' must be a date like 2026-11-01")
        out[r["species_id"]] = {k: r[k] or None for k in VIDEO_COLUMNS[1:]}
    return out


def parse_changes(path, species):
    """A collection's changes.csv: answers that changed in a new version of the list, so students who learnt the old
    answer can study those species again. Optional file. Each row must match species.csv: `ahora` is the value there now.
    Returns {species_id: [{"field", "before", "after", "date"}]}."""
    if not Path(path).exists():
        return {}
    by_id, out, errors = {s["id"]: s for s in species}, {}, []
    for r in read_csv(path, CHANGE_COLUMNS):
        where = f"fila {r['_line']} (row {r['_line']})"
        sid = species_id(" ".join(r["nombre_cientifico"].split()))
        field = CHANGE_FIELDS.get(r["campo"])
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", r["fecha"]):
            errors.append(f"{where}: la fecha '{r['fecha']}' debe ser como 2026-11-04 (date must look like 2026-11-04)")
        elif sid not in by_id:
            errors.append(f"{where}: '{r['nombre_cientifico']}' no está en species.csv (not in species.csv)")
        elif not field:
            errors.append(f"{where}: el campo '{r['campo']}' debe ser uno de {', '.join(CHANGE_FIELDS)} (unknown field)")
        elif (by_id[sid][field] or "") != r["ahora"]:
            errors.append(f"{where}: '{r['ahora']}' no coincide con species.csv, que dice '{by_id[sid][field] or ''}' "
                          f"('ahora' must match species.csv)")
        elif not r["antes"] or r["antes"] == r["ahora"]:
            errors.append(f"{where}: 'antes' debe ser el valor anterior, distinto de 'ahora' ('antes' must be the old value)")
        else:
            out.setdefault(sid, []).append({"field": field, "before": r["antes"], "after": r["ahora"], "date": r["fecha"]})
    if errors:
        raise BuildError(f"{rel(path)}: {len(errors)} error(es):\n  " + "\n  ".join(errors))
    return out


def parse_collection(folder):
    """One collection: collections/<id>/collection.csv (key,value) and species.csv, plus videos.csv and changes.csv if present."""
    folder = Path(folder)
    cid = folder.name
    if not COLLECTION_ID.match(cid):
        raise BuildError(f"{rel(folder)}: a collection folder name may only use a-z, 0-9 and '-'")
    meta = {r["key"]: r["value"] for r in read_csv(folder / "collection.csv", ["key", "value"])}
    missing = [k for k in ("nombre_es", "nombre_en") if not meta.get(k)]
    if missing:
        raise BuildError(f"{rel(folder / 'collection.csv')}: missing key(s) {missing}")
    species = parse_species(folder / "species.csv")
    try:
        order = int(meta.get("orden") or 99)
    except ValueError:
        raise BuildError(f"{rel(folder / 'collection.csv')}: 'orden' must be a whole number")
    return {"id": cid, "name": {"es": meta["nombre_es"], "en": meta["nombre_en"]},
            "edition": meta.get("edicion") or None, "order": order, "species": species,
            "videos": parse_videos(folder / "videos.csv", {s["id"] for s in species}),
            "changes": parse_changes(folder / "changes.csv", species)}


def load_collections(root=COLLECTIONS):
    """Every collection under collections/, in their 'orden'. A species in two collections must agree on its
    class, order and infraorder, because the tree, the facts and the photos are shared."""
    folders = sorted(p for p in Path(root).iterdir() if p.is_dir()) if Path(root).exists() else []
    if not folders:
        raise BuildError(f"{rel(root)}: no collections found (expected collections/<id>/species.csv)")
    cols = sorted((parse_collection(f) for f in folders), key=lambda c: (c["order"], c["id"]))
    ranks = {}
    for c in cols:
        for s in c["species"]:
            key = (s["class"], s["order"], s["infraorder"])
            first = ranks.setdefault(s["id"], (c["id"], key))
            if first[1] != key:
                raise BuildError(f"{s['binomial']}: classified as {first[1]} in '{first[0]}' but as {key} in '{c['id']}'")
    return cols


def all_species(root=COLLECTIONS):
    """The species of every collection, each once (first occurrence)."""
    seen, out = set(), []
    for c in load_collections(root):
        for s in c["species"]:
            if s["id"] not in seen:
                seen.add(s["id"])
                out.append(s)
    return out


def write_all(files):
    """Write {path: text} so that data/ is never half-updated: every file goes to a temporary
    sibling first, and the renames happen only once all of them were written."""
    tmps = []
    try:
        for path, text in files.items():
            path = Path(path)
            path.parent.mkdir(parents=True, exist_ok=True)
            tmp = path.with_name(f".{path.name}.tmp")
            tmp.write_text(text, encoding="utf-8")
            tmps.append((tmp, path))
    except BaseException:
        for tmp, _ in tmps:
            tmp.unlink(missing_ok=True)
        raise
    for tmp, path in tmps:
        os.replace(tmp, path)


def load_json(path, default=None):
    path = Path(path)
    if not path.exists():
        if default is not None:
            return default
        raise BuildError(f"{rel(path)}: not found. Run pipeline/refresh.py first.")
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(obj):
    """Stable JSON: deterministic for identical input, readable diffs in git."""
    return json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=True) + "\n"


YOUTUBE_ID = re.compile(r"(?:v=|youtu\.be/|/embed/)([A-Za-z0-9_-]+)")
