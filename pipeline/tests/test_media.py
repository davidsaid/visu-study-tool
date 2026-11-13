"""Checks on the photo manifest, the rendered files and data/<collection>/media.js.

Run: .venv/bin/python -m unittest discover -s pipeline/tests -p 'test_media.py'
"""
import json
import pathlib
import re
import sys
import unittest
from pathlib import Path

REPO = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "pipeline"))
import media  # noqa: E402

MANIFEST = json.loads((REPO / "curation" / "media_manifest.json").read_text(encoding="utf-8"))
RECORDS = MANIFEST["records"]


class ManifestTest(unittest.TestCase):
    def test_has_records(self):
        self.assertGreater(len(RECORDS), 0)

    def test_every_record_is_credited_and_rendered(self):
        for r in RECORDS:
            with self.subTest(r["id"]):
                self.assertTrue((r.get("author") or "").strip(), "author")
                self.assertRegex(r.get("license") or "", media.ALLOWED_LICENSE, "license")
                self.assertNotRegex(r["license"], r"\bND\b")   # NC allowed since 2026-11-01; never ND
                self.assertRegex(r.get("source_url") or "", r"^https://")
                self.assertIn(r["source"], ("inaturalist", "commons"))
                self.assertTrue(r.get("file"), "file")
                self.assertTrue((REPO / r["file"]).is_file(), r["file"])
                self.assertIsInstance(r.get("w"), int)
                self.assertIsInstance(r.get("h"), int)
                self.assertLessEqual(max(r["w"], r["h"]), media.MAX_SIDE)

    def test_file_names_do_not_reveal_the_species(self):
        for r in RECORDS:
            name = pathlib.PurePosixPath(r["file"]).name
            self.assertRegex(name, r"^[0-9a-f]{12}\.jpg$")
            self.assertEqual(r["file"], f"media/{r['species_id']}/{name}")

    def test_at_most_four_practice_and_two_exam_photos_and_one_per_observation(self):
        per = {}
        for r in RECORDS:
            per.setdefault(r["species_id"], []).append(r)
        for sid, recs in per.items():
            sets = [media.photo_set(r) for r in recs]
            self.assertLessEqual(sets.count("practice"), media.PHOTOS_PER_SPECIES, sid)
            self.assertLessEqual(sets.count("exam"), media.EXAM_PHOTOS, sid)
            self.assertEqual(set(sets) - {"practice", "exam"}, set(), sid)
            # an exam photo is never a practice photo, nor another photo of a practice observation
            pages = [r["page_url"] for r in recs if r["source"] == "inaturalist"]
            self.assertEqual(len(pages), len(set(pages)), sid)
            self.assertEqual(len({r["id"] for r in recs}), len(recs), sid)

    def test_most_species_have_exam_photos(self):
        species = {sid for sid, _ in media.load_species(REPO)}
        with_exam = {r["species_id"] for r in RECORDS if media.photo_set(r) == "exam"}
        self.assertGreaterEqual(len(with_exam & species), 0.9 * len(species))

    def test_files_have_no_exif_and_are_rgb(self):
        from PIL import Image
        for r in RECORDS[::7]:
            with Image.open(REPO / r["file"]) as im:
                self.assertEqual(im.mode, "RGB")
                self.assertEqual(len(im.getexif()), 0, r["file"])
                self.assertNotIn("icc_profile", im.info)
                self.assertEqual(im.size, (r["w"], r["h"]))


class EmitTest(unittest.TestCase):
    def test_media_js_matches_contract(self):
        text = (REPO / "data" / "vertebrados" / "media.js").read_text(encoding="utf-8")
        m = re.search(r"^VISU\.media = (\{.*\});$", text, re.M)
        self.assertIsNotNone(m)
        data = json.loads(m.group(1))
        species = {s["id"] for s in media.load_collections(REPO / "collections")[0]["species"]}
        self.assertEqual(set(data), species)
        for sid, recs in data.items():
            for rec in recs:
                self.assertEqual(list(rec), media.CONTRACT_FIELDS)
                self.assertTrue((REPO / rec["file"]).is_file())
                self.assertIn(rec["modified"], ("resized", "cropped and resized"))
                self.assertIn(rec["set"], ("practice", "exam"))


class RenderImageTest(unittest.TestCase):
    def test_render_image_resizes_and_strips(self):
        """fetch() renders through render_image; a name clash with render() once broke every fetch."""
        import io
        import tempfile
        from PIL import Image
        buf = io.BytesIO()
        Image.new("RGB", (3000, 2000), (10, 120, 40)).save(buf, "JPEG")
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "x.jpg"
            self.assertEqual(media.render_image(buf.getvalue(), dest, 1200), (1200, 800))
            with Image.open(dest) as im:
                self.assertEqual((im.size, len(im.getexif())), ((1200, 800), 0))

    def test_trim_cuts_the_picture_before_resizing(self):
        """A trim removes part of the picture itself (a caption naming the species), not just its display."""
        import io
        import tempfile
        from PIL import Image
        im = Image.new("RGB", (1000, 1000), (255, 255, 255))
        im.paste((200, 0, 0), (0, 900, 1000, 1000))   # a red "caption" band at the bottom
        buf = io.BytesIO()
        im.save(buf, "PNG")
        with tempfile.TemporaryDirectory() as d:
            dest = Path(d) / "x.jpg"
            self.assertEqual(media.render_image(buf.getvalue(), dest, 1200, [0, 0, 1, 0.9]), (1000, 900))
            with Image.open(dest) as out:
                r, g, b = out.getpixel((500, 895))
                self.assertGreater(min(r, g, b), 200)   # the bottom row is white: the band is gone

    def test_trimmed_records_are_marked_cropped(self):
        for r in RECORDS:
            if r.get("trim"):
                self.assertEqual(r["modified"], "cropped and resized", r["id"])


class LicenceParsingTest(unittest.TestCase):
    def test_commons_licences(self):
        self.assertEqual(media.commons_license("CC BY-SA 3.0"), "CC BY-SA 3.0")
        self.assertEqual(media.commons_license("CC BY 2.0"), "CC BY 2.0")
        self.assertEqual(media.commons_license("CC0"), "CC0 1.0")
        self.assertEqual(media.commons_license("Public domain"), "Public domain")
        self.assertEqual(media.commons_license("CC BY-NC-SA 2.0"), "CC BY-NC-SA 2.0")   # NC allowed since 2026-11-01
        self.assertEqual(media.commons_license("CC BY-NC 4.0"), "CC BY-NC 4.0")
        self.assertIsNone(media.commons_license("CC BY-ND 4.0"))
        self.assertIsNone(media.commons_license("CC BY-NC-ND 4.0"))
        self.assertRegex("CC BY-NC-SA 4.0", media.ALLOWED_LICENSE)
        self.assertNotRegex("CC BY-NC-ND 4.0", media.ALLOWED_LICENSE)
        self.assertIsNone(media.commons_license("GFDL"))


if __name__ == "__main__":
    unittest.main()
