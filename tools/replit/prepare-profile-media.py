#!/usr/bin/env python3
"""Prepare a disposable media cache from the owner's original profile bundles.

The ZIP uploads remain the source; generated binary output never enters Git.
No application data, credentials, database, or uploaded user pictures are read.
"""
from pathlib import Path
from zipfile import ZipFile
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "generated-artifacts" / "profile-media"
ALLOWED = {".png", ".jpg", ".jpeg", ".webp", ".webm", ".mp4", ".riv", ".glb", ".woff2", ".md"}


def prepare():
    sources = []
    for pattern in (
        "NEXUS-profile-design-source-and-assets*.zip",
        "NEXUS-profile-effects-assets*.zip",
    ):
        candidates = list((ROOT / "attached_assets").glob(pattern))
        if candidates:
            sources.append(max(candidates, key=lambda file: file.stat().st_mtime))
    if not sources:
        from profile_media_inputs import MANIFEST, verify_cache
        if not MANIFEST.is_file():
            raise SystemExit("Profile media bundles are missing. Restore the original uploaded ZIPs or locked build inputs.")
        try:
            count = verify_cache(CACHE, json.loads(MANIFEST.read_text()))
        except (ValueError, OSError) as error:
            raise SystemExit(str(error)) from error
        print(f"Profile media: {count} original assets verified against locked build inputs.")
    CACHE.mkdir(parents=True, exist_ok=True)
    if sources:
        count = 0
    for source in sources:
        with ZipFile(source) as archive:
            for entry in archive.infolist():
                if entry.is_dir() or "/public/" not in entry.filename:
                    continue
                relative = entry.filename.split("/public/", 1)[1].removeprefix("public/")
                target = CACHE / relative
                if target.suffix.lower() not in ALLOWED:
                    continue
                if not target.resolve().is_relative_to(CACHE.resolve()):
                    raise ValueError("Unsafe profile asset path")
                if not target.exists() or target.stat().st_size != entry.file_size:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(archive.read(entry))
                count += 1
    runtimes = list(ROOT.glob("node_modules/.pnpm/@rive-app+canvas@*/node_modules/@rive-app/canvas/rive.wasm"))
    if runtimes:
        runtime = CACHE / "runtime" / "rive.wasm"
        runtime.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(max(runtimes, key=lambda path: path.stat().st_mtime), runtime)
    manifest = {"files": count, "source": "original-owner-profile-bundles"}
    (CACHE / "manifest.json").write_text(json.dumps(manifest))
    print(f"Profile media: {count} original assets prepared (generated cache, not Git).")


if __name__ == "__main__":
    prepare()
