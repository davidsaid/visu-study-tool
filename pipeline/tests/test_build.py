"""Tests for pipeline/build.py. Run from the repo root:

    .venv/bin/python -m unittest discover -s pipeline/tests

They run the real build against the committed snapshot (no network) and inspect its output.
The build writes into a temporary directory, so running the tests never touches data/.
"""
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))

import build  # noqa: E402
import facts  # noqa: E402
import media  # noqa: E402
from common import COLLECTIONS, ROOT, SNAPSHOT, BuildError, load_collections, parse_species, parse_videos, read_csv  # noqa: E402

VERT = COLLECTIONS / "vertebrados"
FIXTURES = ROOT / "tests" / "fixtures"
OUTPUTS = ["data/collections.js", "data/vertebrados/bestiary.js", "data/vertebrados/content.js",
           "data/vertebrados/media.js", "CREDITS.md", "reports/build-report.md"]


def load_js(path, name, root=ROOT):
    text = (Path(root) / path).read_text(encoding="utf-8")
    return json.loads(text.split(f"VISU.{name} = ", 1)[1].rstrip().rstrip(";"))


def digest(root):
    return {p: hashlib.sha256((Path(root) / p).read_bytes()).hexdigest() for p in OUTPUTS}


class BuildOutput(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name)
        build.build(cls.out)
        cls.first = digest(cls.out)
        cls.data = load_js("data/vertebrados/bestiary.js", "bestiary", cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_vertebrates_parse_to_308(self):
        self.assertEqual(len(parse_species(VERT / "species.csv")), 308)
        self.assertEqual(len(self.data["species"]), 308)
        self.assertEqual(self.data["collection"], {"id": "vertebrados", "name": {"es": "Vertebrados", "en": "Vertebrates"}})
        index = load_js("data/collections.js", "collections", self.out)
        self.assertEqual(index["default"], "vertebrados")
        self.assertEqual([c["id"] for c in index["list"]], ["vertebrados"])

    def test_no_input_document_fields(self):
        """Only our compiled collection is published: no teacher title or author, and every video is credited."""
        self.assertNotIn("title", self.data)
        self.assertNotIn("author", self.data)
        videos = [s["video"] for s in self.data["species"].values() if s["video"]]
        self.assertGreater(len(videos), 200)
        for v in videos:
            self.assertTrue(v["channel"] and v["channel_url"], v["url"])

    def test_every_fact_has_a_registered_source(self):
        for sid, s in self.data["species"].items():
            for f in s["facts"]:
                self.assertTrue(f["src"], f"{sid} {f['field']} has no source")
                for src in f["src"]:
                    self.assertIn(src, self.data["sources"], f"{sid} {f['field']} cites unknown {src}")
                self.assertIn(f["field"], facts.FIELDS)
                self.assertIn(f["match"], ("exact", "synonym", "rule"))
                self.assertTrue(f["es"] and f["en"], f"{sid} {f['field']} lacks a language")

    def test_rule_facts_have_a_note(self):
        for s in self.data["species"].values():
            for f in s["facts"]:
                if f["match"] == "rule":
                    self.assertTrue(f["note"])

    def test_tree_is_connected_and_species_are_leaves_under_their_order(self):
        tree = self.data["tree"]
        nodes = tree["nodes"]
        self.assertIsNone(nodes[tree["root"]]["parent"])
        seen, stack = set(), [tree["root"]]
        while stack:
            nid = stack.pop()
            self.assertNotIn(nid, seen, f"{nid} reached twice")
            seen.add(nid)
            for c in nodes[nid]["children"]:
                self.assertEqual(nodes[c]["parent"], nid)
                stack.append(c)
        self.assertEqual(seen, set(nodes), "every node is reachable from the root")
        for sid, s in self.data["species"].items():
            node = nodes[sid]
            self.assertEqual(node["rank"], "species")
            self.assertEqual(node["children"], [])
            chain, cur = [], node["parent"]
            while cur:
                chain.append(cur)
                cur = nodes[cur]["parent"]
            self.assertIn(f"order:{s['order']}", chain)
            if s["infraorder"]:
                self.assertEqual(node["parent"], f"infraorder:{s['infraorder']}")
            if s["class"] != "Reptilia":
                self.assertIn(f"class:{s['class']}", chain)
        for nid, n in nodes.items():
            if n["rank"] in ("class", "order", "infraorder"):
                self.assertEqual(n["teacher_rank"], n["rank"])
            self.assertTrue(n["name"]["es"], nid)
        self.assertEqual(tree["deep_path"][-1]["scientific"], "Vertebrata")

    def test_reptile_orders_are_a_grade(self):
        nodes = self.data["tree"]["nodes"]
        for o in ("Chelonia", "Squamata", "Sphenodontia", "Crocodylia"):
            self.assertEqual(nodes[f"order:{o}"]["grade"], "Reptilia")
        self.assertNotIn("class:Reptilia", nodes)

    def test_the_grade_reptilia_keeps_its_class_text(self):
        """Reptilia is not a tree node, but its class text (with the etymology the cards show) is published."""
        content = load_js("data/vertebrados/content.js", "content", self.out)
        self.assertNotIn("class:Reptilia", self.data["tree"]["nodes"])
        self.assertIn("etymology", content["groups"]["class:Reptilia"])

    def test_no_parent_of_split_values(self):
        snap = build.load_snapshot()
        species = parse_species(VERT / "species.csv")
        classify = build.make_classifier(build.load_synonym_verdicts(), {s["binomial"] for s in species})
        # Known split species mapped to their old parent (docs/data-sources.md).
        for b, parent in [("Bufo spinosus", "Bufo bufo"), ("Lama guanicoe", "Lama glama"),
                          ("Lynx pardinus", "Lynx lynx")]:
            self.assertEqual(classify(b, {"name": parent, "via": "trinomial"}), "parent_of_split")
            self.assertEqual(classify(b, {"name": parent, "via": "synonym"}), "parent_of_split")
        self.assertEqual(classify("Macropus rufus", {"name": "Osphranter rufus", "via": "synonym"}), "synonym")
        for s in species:
            sp = facts.Species(s, snap["traits"], classify)
            for ds, (_, match) in sp.rows.items():
                self.assertNotEqual(match, "parent_of_split")
            dropped = {facts.DATASET_SOURCE.get(d["dataset"], d["dataset"]) for d in sp.dropped}
            kept = {facts.DATASET_SOURCE.get(d, d) for d in sp.rows}
            for f in self.data["species"][s["id"]]["facts"]:
                for src in f["src"]:
                    self.assertFalse(src in dropped and src not in kept,
                                     f"{s['id']} {f['field']} uses {src}, matched only as parent_of_split")

    def test_no_raw_wikidata_mass(self):
        for s in self.data["species"].values():
            for f in s["facts"]:
                if f["field"] == "mass":
                    self.assertNotIn("wikidata", f["src"])

    def test_build_is_deterministic(self):
        build.build(self.out)
        self.assertEqual(digest(self.out), self.first)

    def test_committed_data_matches_a_fresh_build(self):
        self.assertEqual(digest(ROOT), self.first, "data/ is stale: run pipeline/build.py")

    def test_every_url_is_http(self):
        build.check_output_urls(self.data, "bestiary")   # raises on anything else
        for recs in load_js("data/vertebrados/media.js", "media", self.out).values():
            for r in recs:
                for k in media.URL_FIELDS:
                    self.assertRegex(r[k] or "https://", r"^https?://")


def excel_copy(directory, delimiter=";", encoding="utf-8-sig"):
    """The collections folder with the real species list as Excel in a Spanish locale saves it: ';', BOM, CRLF."""
    import csv
    import io
    cols = Path(directory) / "collections"
    shutil.copytree(COLLECTIONS, cols)
    rows = list(csv.reader(io.StringIO((VERT / "species.csv").read_text(encoding="utf-8"))))
    buf = io.StringIO()
    csv.writer(buf, delimiter=delimiter, lineterminator="\r\n").writerows(rows)
    path = cols / "vertebrados" / "species.csv"
    path.write_bytes(buf.getvalue().encode(encoding))
    return cols


class ExcelExports(unittest.TestCase):
    def test_semicolon_bom_build_keeps_every_photo(self):
        with tempfile.TemporaryDirectory() as d:
            build.build(Path(d), excel_copy(d))
            got = load_js("data/vertebrados/media.js", "media", d)
            want = load_js("data/vertebrados/media.js", "media")
            self.assertEqual(len(got), 308)
            self.assertEqual(sum(map(len, got.values())), sum(map(len, want.values())))
            self.assertGreater(sum(map(len, got.values())), 0)

    def test_cp1252_fails_with_save_as_utf8_and_writes_nothing(self):
        with tempfile.TemporaryDirectory() as d:
            cols = excel_copy(d, encoding="cp1252")
            with self.assertRaisesRegex(BuildError, "CSV UTF-8"):
                build.build(Path(d), cols)
            self.assertFalse((Path(d) / "data").exists())
            self.assertEqual(list(Path(d).iterdir()), [cols])

    def test_media_refuses_a_large_list_with_few_photos(self):
        fake = [(f"genus_s{i}", f"Genus s{i}") for i in range(25)]
        with self.assertRaisesRegex(BuildError, "media"):
            media.render(ROOT, fake + [("bubo_bubo", "Bubo bubo")])
        self.assertIn("VISU.media", media.render(ROOT, [("bubo_bubo", "Bubo bubo")]))   # a small list is fine

    def test_media_load_species_reads_semicolons(self):
        with tempfile.TemporaryDirectory() as d:
            excel_copy(d)
            self.assertEqual(media.load_species(Path(d)), media.load_species(ROOT))


def merged_snapshot(directory, *folders):
    """One snapshot folder holding the entries of several (tests build the fixture next to the vertebrates)."""
    out = Path(directory) / "snapshot"
    out.mkdir()
    for name in ("meta", "names", "traits", "wikidata", "countries", "inaturalist", "links", "miteco"):
        merged = {}
        for f in folders:
            obj = json.loads((Path(f) / f"{name}.json").read_text(encoding="utf-8"))
            for k, v in obj.items():
                if isinstance(v, dict) and isinstance(merged.get(k), dict):
                    merged[k] = {**v, **merged[k]}
                else:
                    merged.setdefault(k, v)
        (out / f"{name}.json").write_text(json.dumps(merged), encoding="utf-8")
    return out


class Collections(unittest.TestCase):
    """Several collections in one site: each gets its own tree, data files and index entry."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        d = Path(cls.tmp.name)
        cols = d / "collections"
        shutil.copytree(COLLECTIONS, cols)
        shutil.copytree(FIXTURES / "collections" / "artropodos-prueba", cols / "artropodos-prueba")
        build.build(d, cols, merged_snapshot(d, SNAPSHOT, FIXTURES / "snapshot"))
        cls.out = d

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_index_lists_both_in_order(self):
        index = load_js("data/collections.js", "collections", self.out)
        self.assertEqual([c["id"] for c in index["list"]], ["vertebrados", "artropodos-prueba"])
        self.assertEqual(index["list"][1]["species"], 10)

    def test_each_tree_has_its_own_root_and_deep_path(self):
        art = load_js("data/artropodos-prueba/bestiary.js", "bestiary", self.out)
        vert = load_js("data/vertebrados/bestiary.js", "bestiary", self.out)
        self.assertEqual(art["tree"]["root"], "clade:arthropoda")
        self.assertIn("Ecdysozoa", [x["scientific"] for x in art["tree"]["deep_path"]])
        self.assertEqual(vert["tree"]["root"], "clade:vertebrata")
        self.assertFalse([n for n in vert["tree"]["nodes"] if "arthropoda" in n or n == "class:Insecta"])
        self.assertFalse([n for n in art["tree"]["nodes"] if n.startswith("class:Aves")])
        self.assertEqual(len(art["species"]), 10)

    def test_vertebrates_unchanged_by_a_second_collection(self):
        alone = load_js("data/vertebrados/bestiary.js", "bestiary")
        here = load_js("data/vertebrados/bestiary.js", "bestiary", self.out)
        self.assertEqual(alone["species"], here["species"])
        self.assertEqual(alone["tree"], here["tree"])

    def test_a_species_must_agree_across_collections(self):
        with tempfile.TemporaryDirectory() as d:
            cols = Path(d) / "c"
            shutil.copytree(FIXTURES / "collections" / "artropodos-prueba", cols / "a")
            shutil.copytree(FIXTURES / "collections" / "artropodos-prueba", cols / "b")
            path = cols / "b" / "species.csv"
            path.write_text(path.read_text(encoding="utf-8").replace("Insecta,Diptera", "Insecta,Hymenoptera"), encoding="utf-8")
            with self.assertRaisesRegex(BuildError, "Musca domestica"):
                load_collections(cols)

    def _build_one(self, species_csv):
        with tempfile.TemporaryDirectory() as d:
            cols = Path(d) / "c" / "mixta"
            cols.mkdir(parents=True)
            (cols / "collection.csv").write_text("key,value\nnombre_es,Mixta\nnombre_en,Mixed\n", encoding="utf-8")
            (cols / "species.csv").write_text(species_csv, encoding="utf-8")
            build.build(Path(d), cols.parent, merged_snapshot(d, SNAPSHOT, FIXTURES / "snapshot"))
            return load_js("data/mixta/bestiary.js", "bestiary", d)

    def test_classes_under_several_top_clades_share_their_deepest_common_ancestor(self):
        b = self._build_one("clase,orden,infraorden,nombre_cientifico,nombre_vulgar\n"
                            "Insecta,Hymenoptera,,Apis mellifera,Abeja de la miel\n"
                            "Mammalia,Carnivora,,Lynx pardinus,Lince ibérico\n")
        nodes = b["tree"]["nodes"]
        self.assertEqual(b["tree"]["root"], "deep:bilateria")
        self.assertEqual(b["tree"]["deep_path"][-1]["scientific"], "Bilateria")
        for nid in ("deep:protostomia", "deep:deuterostomia", "clade:arthropoda", "clade:vertebrata"):
            self.assertIn(nid, nodes)
            self.assertEqual(nodes[nid]["rank"], "clade")
        self.assertIsNone(nodes["deep:bilateria"]["parent"])

    def test_classes_missing_from_clades_get_the_collections_own_root(self):
        b = self._build_one("clase,orden,infraorden,nombre_cientifico,nombre_vulgar\n"
                            "Claseprueba,Ordenprueba,,Apis mellifera,Abeja de la miel\n"
                            "Claseprueba,Ordenprueba,,Musca domestica,Mosca doméstica\n")
        nodes = b["tree"]["nodes"]
        self.assertEqual(b["tree"]["root"], "clade:collection")
        self.assertEqual(nodes["clade:collection"]["name"], {"es": "Mixta", "en": "Mixed"})
        self.assertEqual(nodes["class:Claseprueba"]["parent"], "clade:collection")
        self.assertEqual(nodes["order:Ordenprueba"]["parent"], "class:Claseprueba")

    ROWS_HEAD = "node_id,parent_id,scientific,name_es,name_en,source_url\n"
    SP = [{"id": "apis_mellifera", "binomial": "Apis mellifera", "class": "Insecta", "order": "Hymenoptera", "infraorder": None, "common_es": "Abeja", "line": 2},
          {"id": "araneus_diadematus", "binomial": "Araneus diadematus", "class": "Arachnida", "order": "Araneae", "infraorder": None, "common_es": "Araña", "line": 3}]

    def _rows(self, text):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "clades.csv"
            p.write_text(self.ROWS_HEAD + text, encoding="utf-8")
            return read_csv(p, ["node_id", "parent_id", "scientific", "name_es", "name_en", "source_url"])

    def test_a_class_row_without_parent_keeps_its_names_under_the_root(self):
        rows = self._rows("deep:life,,Biota,Vida,Life,https://x.org/l\n"
                          "clade:hexapoda,deep:life,Hexapoda,Hexápodos,Hexapods,https://x.org/h\n"
                          "class:Insecta,clade:hexapoda,Insecta,Insectos,Insects,https://x.org/i\n"
                          "class:Arachnida,,Arachnida,Arácnidos,Arachnids,https://x.org/a\n"
                          "order:Araneae,class:Arachnida,Araneae,Arañas,Spiders,https://x.org/s\n")
        warnings = build.Warnings()
        tree = build.build_tree(self.SP, warnings, rows)
        n = tree["nodes"]
        self.assertEqual(tree["root"], "clade:hexapoda")
        self.assertEqual(n["class:Arachnida"]["parent"], "clade:hexapoda")
        self.assertEqual(n["class:Arachnida"]["name"], {"es": "Arácnidos", "en": "Arachnids"})
        self.assertEqual(n["order:Araneae"]["name"]["es"], "Arañas")
        self.assertFalse([w for w in warnings if "Arachnida" in w and "has no row" in w])
        self.assertTrue([w for w in warnings if "no parent clade" in w])

    def test_a_cycle_in_deep_rows_stops_the_build(self):
        rows = self._rows("deep:a,deep:b,A,A,A,https://x.org/a\ndeep:b,deep:a,B,B,B,https://x.org/b\n"
                          "clade:x,deep:a,X,X,X,https://x.org/x\nclade:y,deep:b,Y,Y,Y,https://x.org/y\n"
                          "class:Insecta,clade:x,Insecta,Insectos,Insects,https://x.org/i\n"
                          "class:Arachnida,clade:y,Arachnida,Arácnidos,Arachnids,https://x.org/r\n")
        with self.assertRaisesRegex(BuildError, "cycle"):
            build.build_tree(self.SP, build.Warnings(), rows)

    def test_collection_folder_names_are_safe(self):
        with tempfile.TemporaryDirectory() as d:
            shutil.copytree(FIXTURES / "collections" / "artropodos-prueba", Path(d) / "Bad Name")
            with self.assertRaisesRegex(BuildError, "a-z"):
                load_collections(Path(d))


class LinkStatus(unittest.TestCase):
    def test_a_changed_link_does_not_inherit_the_old_status(self):
        links = {"checked": "2026-11-01", "links": {"https://example.org/old": {"url": "https://example.org/old", "status": "ok"}}}
        report = {"link_missing": [], "link_unknown": []}
        v = {"url": "https://example.org/new", "channel": "C", "channel_url": "https://example.org/c", "title": "T",
             "checked": "2026-10-30"}
        got = build.video(v, links, "bubo_bubo", report)
        self.assertEqual((got["status"], got["checked"]), ("unchecked", "2026-10-30"))
        v["url"] = "https://example.org/old"
        got = build.video(v, links, "bubo_bubo", report)
        self.assertEqual((got["status"], got["channel"]), ("ok", "C"))

    def test_a_repaired_url_is_published(self):
        links = {"checked": "2026-11-01", "links": {"https://www.youtube.com/watch?v=abcdefghijkO.": {
            "status": "ok", "repaired_url": "https://www.youtube.com/watch?v=abcdefghijk"}}}
        v = {"url": "https://www.youtube.com/watch?v=abcdefghijkO.", "channel": "C", "channel_url": "https://x.org", "title": "T"}
        got = build.video(v, links, "bubo_bubo", {"link_missing": [], "link_unknown": []})
        self.assertEqual(got["url"], "https://www.youtube.com/watch?v=abcdefghijk")

    def test_video_checked_must_be_a_date(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "videos.csv"
            p.write_text("species_id,url,channel,channel_url,title,checked\nbubo_bubo,https://x.org/v,C,https://x.org,T,ayer\n", encoding="utf-8")
            with self.assertRaisesRegex(BuildError, "date"):
                parse_videos(p, {"bubo_bubo"})

    def test_video_links_must_be_http(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "videos.csv"
            p.write_text("species_id,url,channel,channel_url,title,checked\nbubo_bubo,javascript:alert(1),C,https://x.org,T,\n", encoding="utf-8")
            with self.assertRaisesRegex(BuildError, "http"):
                parse_videos(p, {"bubo_bubo"})


class LoudFailure(unittest.TestCase):
    def parse(self, text):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "species.csv"
            p.write_text(text, encoding="utf-8")
            return parse_species(p)

    HEADER = "clase,orden,infraorden,nombre_cientifico,nombre_vulgar\n"

    def test_missing_column(self):
        with self.assertRaisesRegex(BuildError, "missing column"):
            self.parse("clase,orden,nombre_cientifico,nombre_vulgar\nAves,Strigiformes,Bubo bubo,Búho real\n")

    def test_duplicate_binomial(self):
        with self.assertRaisesRegex(BuildError, "repetido"):
            self.parse(self.HEADER + "Aves,Strigiformes,,Bubo bubo,Búho real\nAves,Strigiformes,,Bubo bubo,Búho\n")

    def test_empty_class(self):
        with self.assertRaisesRegex(BuildError, "'clase' está vacía"):
            self.parse(self.HEADER + ",Strigiformes,,Bubo bubo,Búho real\n")

    def test_not_a_binomial(self):
        with self.assertRaisesRegex(BuildError, "binomio"):
            self.parse(self.HEADER + "Aves,Strigiformes,,Bubo,Búho real\n")

    def test_unquoted_comma_shifts_no_column(self):
        with self.assertRaisesRegex(BuildError, r"fila 2: tiene 6 columnas.*row 2"):
            self.parse(self.HEADER + "Mammalia,Carnivora,,Lynx pardinus,Lince, ibérico\n")

    def test_short_row_fails(self):
        with self.assertRaisesRegex(BuildError, "fila 2"):
            self.parse(self.HEADER + "Mammalia,Carnivora,,Lynx pardinus\n")

    def test_quoted_comma_is_fine(self):
        rows = self.parse(self.HEADER + 'Mammalia,Carnivora,,Lynx pardinus,"Lince, ibérico"\n')
        self.assertEqual(rows[0]["common_es"], "Lince, ibérico")

    def test_duplicate_header(self):
        with self.assertRaisesRegex(BuildError, "columna repetida"):
            self.parse("clase,orden,infraorden,nombre_cientifico,nombre_vulgar,clase\n"
                       "Aves,Strigiformes,,Bubo bubo,Búho real,Aves\n")

    def test_cp1252_names_the_row(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "species.csv"
            p.write_bytes((self.HEADER + "Mammalia,Carnivora,,Lynx pardinus,Lince ibérico\n").encode("cp1252"))
            with self.assertRaisesRegex(BuildError, r"(?s)fila 2.*Lince ibérico.*CSV UTF-8"):
                parse_species(p)

    def test_comment_lines_keep_row_numbers(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "o.csv"
            p.write_text("species_id,action,media_id_or_url,value\n# a, comment\nbubo_bubo,pin,x\n", encoding="utf-8")
            with self.assertRaisesRegex(BuildError, "fila 3"):
                read_csv(p, ["species_id"], comment="#")

    def test_semicolon_excel_export_is_accepted(self):
        rows = self.parse("clase;orden;infraorden;nombre_cientifico;nombre_vulgar\n"
                          "Aves;Strigiformes;;Bubo bubo;Búho real\n")
        self.assertEqual(rows[0]["id"], "bubo_bubo")


class Formatting(unittest.TestCase):
    def test_units_and_decimal_comma(self):
        self.assertEqual(facts.mass(11000, "es"), "11 kg")
        self.assertEqual(facts.mass(9500, "es"), "9,5 kg")
        self.assertEqual(facts.mass(9500, "en"), "9.5 kg")
        self.assertEqual(facts.mass(350, "en"), "350 g")
        self.assertEqual(facts.length(875, "es"), "87,5 cm")
        self.assertEqual(facts.length(1500, "en"), "1.5 m")
        self.assertEqual(facts.years(1, "es"), "1 año")
        self.assertEqual(facts.fmt(1234, "es", 4), "1234")
        self.assertEqual(facts.fmt(12345, "es", 5), "12 345")


if __name__ == "__main__":
    unittest.main()
