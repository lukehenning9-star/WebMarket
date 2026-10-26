import importlib.util
import io
import json
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build  # noqa: E402


def load_add_to_market():
    spec = importlib.util.spec_from_file_location("add_to_market", SCRIPTS / "add-to-market.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


add_to_market = load_add_to_market()


def write_site(previews: Path, slug: str, meta=None, with_index=True):
    folder = previews / slug
    folder.mkdir(parents=True)
    if with_index:
        (folder / "index.html").write_text("<h1>site</h1>", encoding="utf-8")
    if meta is not None:
        (folder / "meta.json").write_text(json.dumps(meta), encoding="utf-8")


class BuildManifestTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.previews = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_includes_only_folders_with_index_html_sorted_by_slug(self):
        write_site(self.previews, "zeta-bbq", {"name": "Zeta BBQ", "city": "Waco, TX"})
        write_site(self.previews, "alpha-grooming", {"name": "Alpha Grooming"})
        write_site(self.previews, "unfinished", {"name": "Unfinished"}, with_index=False)
        (self.previews / "stray-file.txt").write_text("x")

        entries = build.build_manifest(self.previews)

        self.assertEqual([e["id"] for e in entries], ["alpha-grooming", "zeta-bbq"])
        written = json.loads((self.previews / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(written, entries)

    def test_entry_shape_and_preview_path(self):
        write_site(self.previews, "papa-jacks-bbq", {
            "name": "Papa Jack's BBQ",
            "category": "BBQ",
            "city": "Waco, TX",
            "price": 500,
            "features": ["Online Menu"],
            "contactEmail": "owner@example.com",
            "tier": 3,
        })
        [entry] = build.build_manifest(self.previews)
        self.assertEqual(entry, {
            "id": "papa-jacks-bbq",
            "name": "Papa Jack's BBQ",
            "category": "BBQ",
            "city": "Waco, TX",
            "price": 500,
            "previewPath": "previews/papa-jacks-bbq",
            "features": ["Online Menu"],
        })

    def test_does_not_publish_private_meta_fields(self):
        write_site(self.previews, "x", {"name": "X", "contactEmail": "owner@example.com"})
        build.build_manifest(self.previews)
        self.assertNotIn("owner@example.com", (self.previews / "manifest.json").read_text())

    def test_folder_without_meta_gets_name_from_slug(self):
        write_site(self.previews, "the-eatery")
        [entry] = build.build_manifest(self.previews)
        self.assertEqual(entry["name"], "The Eatery")
        self.assertEqual(entry["features"], [])

    def test_invalid_meta_fails_loudly(self):
        write_site(self.previews, "bad", {"name": "Bad", "features": "not-a-list"})
        with self.assertRaises(ValueError):
            build.build_manifest(self.previews)

    def test_cli_reports_missing_directory(self):
        err = io.StringIO()
        with redirect_stderr(err):
            code = build.main(["--previews-dir", str(self.previews / "missing")])
        self.assertEqual(code, 1)
        self.assertIn("not found", err.getvalue())


class AddToMarketTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.previews = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_cli(self, *extra):
        args = ["--name", "Mario's Pizza", "--category", "Italian", "--city", "Dallas, TX",
                "--price", "500", "--features", "Online Menu, Contact Form,",
                "--previews-dir", str(self.previews), *extra]
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = add_to_market.main(args)
        return code, err.getvalue()

    def test_slugify(self):
        self.assertEqual(add_to_market.slugify("Mario's Pizza"), "marios-pizza")
        self.assertEqual(add_to_market.slugify("Barks-An-Bubbles"), "barks-an-bubbles")
        self.assertEqual(add_to_market.slugify("  Tanker BBQ Co. "), "tanker-bbq-co")
        self.assertEqual(add_to_market.slugify("A -- B"), "a-b")
        self.assertEqual(add_to_market.slugify("!!!"), "")

    def test_registers_site_and_rebuilds_manifest(self):
        code, _ = self.run_cli()
        self.assertEqual(code, 0)

        folder = self.previews / "marios-pizza"
        meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
        self.assertEqual(meta["features"], ["Online Menu", "Contact Form"])
        self.assertIn("Mario&#x27;s Pizza", (folder / "index.html").read_text(encoding="utf-8"))

        manifest = json.loads((self.previews / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual([e["id"] for e in manifest], ["marios-pizza"])

    def test_refuses_to_overwrite_existing_meta_without_force(self):
        self.assertEqual(self.run_cli()[0], 0)
        code, err = self.run_cli()
        self.assertEqual(code, 1)
        self.assertIn("--force", err)
        self.assertEqual(self.run_cli("--force")[0], 0)

    def test_keeps_an_existing_built_site(self):
        write_site(self.previews, "marios-pizza")
        self.run_cli()
        self.assertEqual((self.previews / "marios-pizza" / "index.html").read_text(), "<h1>site</h1>")

    def test_rejects_names_that_produce_an_empty_slug(self):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = add_to_market.main(["--name", "!!!", "--category", "x", "--city", "y",
                                       "--price", "1", "--previews-dir", str(self.previews)])
        self.assertEqual(code, 1)
        self.assertEqual(list(self.previews.iterdir()), [])


class RealCatalogTest(unittest.TestCase):
    """Guards the committed catalog: every site must build into a valid entry."""

    def test_every_preview_has_metadata_and_a_matching_manifest(self):
        previews = REPO_ROOT / "public" / "previews"
        sites = sorted(p.name for p in previews.iterdir() if (p / "index.html").exists())
        self.assertGreater(len(sites), 0)
        for slug in sites:
            meta = json.loads((previews / slug / "meta.json").read_text(encoding="utf-8"))
            for field in ("name", "category", "city"):
                self.assertTrue(meta.get(field), f"{slug}/meta.json is missing '{field}'")

        committed = json.loads((previews / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual([e["id"] for e in committed], sites,
                         "manifest.json is stale; run `npm run build`")


if __name__ == "__main__":
    unittest.main()
