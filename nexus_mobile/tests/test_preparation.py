import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import tomllib
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tool"))
from prepare import validate_bundle_id, validate_origin
from upstream import ROOT, SOURCE, lock, unpack


class PreparationTests(unittest.TestCase):
    def test_https_origin_only(self):
        self.assertEqual(validate_origin("https://chat.example.org/"), "https://chat.example.org")
        for value in ("http://chat.example.org", "https://x/api", "https://user:pass@x", "https://x/?q=1", "https://x/#fragment"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_origin(value)

    def test_no_inherited_signed_bundle_identity(self):
        self.assertEqual(validate_bundle_id("org.example.nexus"), "org.example.nexus")
        for value in ("com.fluxer", "com.fluxer.canary", "https://example.com", "123"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                validate_bundle_id(value)

    def test_all_sources_are_exact_and_checksum_pinned(self):
        for name in ("client", "sdk", "parser"):
            self.assertRegex(lock()[name]["revision"], r"^[0-9a-f]{40}$")
            self.assertRegex(lock()[name]["sha256"], r"^[0-9a-f]{64}$")

    def test_archive_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "unsafe.tar.gz"
            with tarfile.open(path, "w:gz") as archive:
                entry = tarfile.TarInfo("root/../../escape")
                entry.size = 4
                archive.addfile(entry, io.BytesIO(b"oops"))
            with self.assertRaises(ValueError):
                unpack(path, Path(directory) / "output")
            self.assertFalse((Path(directory) / "escape").exists())

    @unittest.skipUnless((SOURCE / ".nexus-prepared.json").exists(), "Prepare source first")
    def test_native_identity_and_license_integrity(self):
        project = (SOURCE / "ios/Runner.xcodeproj/project.pbxproj").read_text()
        self.assertNotIn("DEVELOPMENT_TEAM = 3G5837T29K", project)
        self.assertNotIn("com.fluxer", project)
        self.assertIn("FluxerNativeMeasure.swift", project)
        self.assertTrue((SOURCE / "ios/Runner/FluxerNativeMeasure.swift").is_file())
        self.assertTrue((SOURCE / "LICENSE").is_file())
        self.assertTrue((SOURCE / "LICENSE-APPSTORE-EXCEPTION").is_file())
        self.assertTrue((SOURCE / "assets/licenses/NEXUS-fonts-LICENSE-IBM-PLEX.txt").is_file())

    @unittest.skipUnless((SOURCE / ".nexus-prepared.json").exists(), "Prepare source first")
    def test_native_fonts_and_mark_are_not_placeholders(self):
        from fontTools.ttLib import TTFont
        with TTFont(SOURCE / "assets/fonts/nexus/NEXUSSansArabic-Regular.ttf") as font:
            self.assertIn(ord("س"), font.getBestCmap())
        for name in ("fluxer-logo-text.svg", "fluxer-logo-wordmark-monochrome.svg"):
            svg = (SOURCE / "assets/images" / name).read_text()
            self.assertNotIn("<text", svg)
            self.assertIn("<path", svg)

    @unittest.skipUnless((SOURCE / ".nexus-prepared.json").exists(), "Prepare source first")
    def test_original_feature_files_are_retained(self):
        with tarfile.open(SOURCE.parent / "downloads/client.tar.gz", "r:gz") as archive:
            features = [
                Path(*Path(member.name).parts[1:])
                for member in archive.getmembers()
                if member.isfile()
                and "/lib/features/" in member.name
                and member.name.endswith(".dart")
            ]
        self.assertGreater(len(features), 100)
        missing = [str(path) for path in features if not (SOURCE / path).is_file()]
        self.assertEqual(missing, [], "Brand adaptation must not remove original feature modules")

    @unittest.skipUnless((SOURCE / ".nexus-prepared.json").exists(), "Prepare source first")
    def test_parser_pins_and_plugin_package_path(self):
        parser = SOURCE / "fluxer/packages/markdown_parser/rust"
        self.assertIn("[workspace]", (parser / "Cargo.toml").read_text())
        upstream = tomllib.loads((SOURCE / "fluxer/Cargo.lock").read_text())
        native = tomllib.loads((parser / "Cargo.lock").read_text())
        pins = {
            (p["name"], p["version"], p.get("source")): p.get("checksum")
            for p in upstream["package"]
        }
        for package in native["package"]:
            key = (package["name"], package["version"], package.get("source"))
            self.assertIn(key, pins, "Standalone parser must not upgrade upstream dependencies")
            self.assertEqual(package.get("checksum"), pins[key])
        receipt = json.loads((SOURCE / ".nexus-prepared.json").read_text())
        plugin = SOURCE / "packages/fluxer_android_host/android/src/main/kotlin"
        self.assertTrue(
            (plugin.joinpath(*receipt["bundle_id"].split(".")) / "host/FluxerAndroidHostPlugin.kt").is_file()
        )


if __name__ == "__main__":
    unittest.main()
