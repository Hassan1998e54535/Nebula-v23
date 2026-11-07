import hashlib
import io
import tempfile
from pathlib import Path
import unittest

from profile_media_inputs import restore, validate_manifest, verify_cache


class ProfileMediaInputTests(unittest.TestCase):
    def manifest(self, **overrides):
        value = {
            "schema": 1, "assetOrigin": "https://example.com",
            "files": [{"path": "effects/original.webp", "bytes": 5,
                       "sha256": hashlib.sha256(b"asset").hexdigest()}],
        }
        return value | overrides

    def test_rejects_private_or_invalid_origin(self):
        for origin in ("http://example.com", "https://user:password@example.com", "https://example.com/api"):
            with self.assertRaises(ValueError):
                validate_manifest(self.manifest(assetOrigin=origin))

    def test_rejects_traversal_and_duplicate_assets(self):
        for name in ("../private.webp", "/outside.webp", "C:/outside.webp", "a\\b.webp", "a/./b.webp"):
            value = self.manifest()
            value["files"][0]["path"] = name
            with self.assertRaises(ValueError):
                validate_manifest(value)
        value = self.manifest()
        value["files"] *= 2
        with self.assertRaises(ValueError):
            validate_manifest(value)

    def test_original_hash_required_before_installing_download(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with self.assertRaises(ValueError):
                restore(root, self.manifest(), opener=lambda *a, **kw: io.BytesIO(b"wrong"))
            self.assertFalse((root / "effects/original.webp").exists())
            self.assertEqual(restore(root, self.manifest(), opener=lambda *a, **kw: io.BytesIO(b"asset")), 1)
            self.assertEqual(verify_cache(root, self.manifest()), 1)

    def test_modified_cache_is_not_mistaken_for_a_verified_input(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "effects").mkdir()
            (root / "effects/original.webp").write_bytes(b"other")
            with self.assertRaises(ValueError):
                verify_cache(root, self.manifest())

    def test_cache_symlink_cannot_write_outside_cache(self):
        with tempfile.TemporaryDirectory() as folder, tempfile.TemporaryDirectory() as outside:
            root = Path(folder)
            (root / "effects").symlink_to(outside, target_is_directory=True)
            with self.assertRaises(ValueError):
                restore(root, self.manifest(), opener=lambda *a, **kw: io.BytesIO(b"asset"))


if __name__ == "__main__":
    unittest.main()
