"""Build a throwaway copy of the site with two collections (vertebrados + the test arthropods), for the
browser checks of collection switching:

    .venv/bin/python tests/fixture_site.py /tmp/visu-site
    open "/tmp/visu-site/tests/harness.html?s=collections"   (Chrome, with --allow-file-access-from-files)

Nothing in the repository changes; the arthropod collection never ships.
"""
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "pipeline" / "tests"))

import build  # noqa: E402
from test_build import merged_snapshot  # noqa: E402


def main(dest):
    dest = Path(dest)
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for name in ("index.html", "app", "vendor", "media", "tests"):
        src = ROOT / name
        (shutil.copytree if src.is_dir() else shutil.copy)(src, dest / name)
    with tempfile.TemporaryDirectory() as d:
        cols = Path(d) / "collections"
        shutil.copytree(ROOT / "collections", cols)
        shutil.copytree(ROOT / "tests" / "fixtures" / "collections" / "artropodos-prueba", cols / "artropodos-prueba")
        build.build(dest, cols, merged_snapshot(d, ROOT / "pipeline" / "snapshot", ROOT / "tests" / "fixtures" / "snapshot"))
    print(f"site with two collections at {dest}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/visu-fixture-site")
