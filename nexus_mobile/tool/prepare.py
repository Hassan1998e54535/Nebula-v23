#!/usr/bin/env python3
"""Assemble a NEXUS native source tree without moving the web/server project."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import urlsplit, urlunsplit

from adapt import apply_android_changes, apply_client_changes, apply_icons, apply_ios_changes, apply_overlays
from fonts import prepare_fonts
from upstream import MOBILE, ROOT, SOURCE, archive, lock, unpack


def validate_origin(value):
    parsed = urlsplit(value.strip())
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("NEXUS origin must be an HTTPS origin without credentials")
    if parsed.path not in ("", "/") or parsed.query or parsed.fragment:
        raise ValueError("Use the bare origin, without /api, query, or fragment")
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


def validate_bundle_id(value):
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*){2,}", value):
        raise ValueError("Bundle ID must be a reverse-DNS identifier, not a team ID or URL")
    if value.lower() == "com.fluxer" or value.lower().startswith("com.fluxer."):
        raise ValueError("Use an identifier authorized for NEXUS, never Fluxer's signed identity")
    return value


def inputs_fingerprint(origin, bundle_id):
    value = hashlib.sha256()
    files = [MOBILE / "upstream.lock.json"]
    for directory in (MOBILE / "tool", MOBILE / "overlays"):
        files.extend(directory.rglob("*"))
    for family in ("NEXUSSans", "NEXUSMono", "NEXUSSansArabic"):
        files.extend((ROOT / "packages/fonts/files" / family).glob("*.woff2"))
    files.extend([
        ROOT / "packages/fonts/LICENSE-IBM-PLEX.txt",
        ROOT / "packages/fonts/NOTICE.md",
        ROOT / "nexus_app/src/media/images/nexus-brand-icon.svg",
        ROOT / "nexus_app/src/media/images/nexus-brand-icon-monochrome.svg",
    ])
    for path in sorted(files):
        if path.is_file() and path.suffix != ".pyc" and "__pycache__" not in path.parts:
            value.update(str(path.relative_to(ROOT)).encode())
            value.update(path.read_bytes())
    value.update(f"{origin}\n{bundle_id}".encode())
    return value.hexdigest()


def prepare(origin, bundle_id, offline=False, refresh=False):
    origin = validate_origin(origin)
    bundle_id = validate_bundle_id(bundle_id)
    fingerprint = inputs_fingerprint(origin, bundle_id)
    marker = SOURCE / ".nexus-prepared.json"
    if marker.exists() and not refresh:
        old = json.loads(marker.read_text())
        if old["fingerprint"] == fingerprint:
            print(f"NEXUS native source already prepared: {SOURCE.relative_to(ROOT)}")
            return SOURCE
    pinned = lock()
    inputs = {
        key: archive("server" if key == "parser" else key, pinned[key], offline)
        for key in ("client", "sdk", "parser")
    }
    stage = SOURCE.with_name("staging")
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    unpack(inputs["client"], stage)
    unpack(inputs["sdk"], stage / "dart_sdk")
    # Only the standalone Rust parser and its licenses/lock, not another backend.
    unpack(
        inputs["parser"], stage / "fluxer",
        selected=lambda p: str(p).startswith("packages/markdown_parser/rust/") or
        str(p) in ("Cargo.lock", "LICENSE", "LICENSE-APPSTORE-EXCEPTION"),
    )
    parser = stage / "fluxer/packages/markdown_parser/rust"
    # Standalone lock generated with Cargo from the pinned upstream lock. It
    # removes unrelated workspace packages/features without upgrading versions.
    shutil.copyfile(MOBILE / "tool/parser.Cargo.lock", parser / "Cargo.lock")
    # This is a standalone native asset, not a member of NEXUS's parent Rust
    # workspace. Never add mobile build dependencies to the backend workspace.
    with (parser / "Cargo.toml").open("a") as manifest:
        manifest.write("\n[workspace]\n")
    apply_client_changes(stage)
    apply_ios_changes(stage, bundle_id, origin)
    apply_android_changes(stage, bundle_id)
    apply_icons(stage)
    apply_overlays(stage)
    prepare_fonts(stage)
    (stage / ".nexus-prepared.json").write_text(json.dumps({
        "fingerprint": fingerprint, "origin": origin,
        "bundle_id": bundle_id, "upstream": pinned,
        "signed": False,
    }, indent=2) + "\n")
    # Reuse local tool caches only for the exact same source references. Keep
    # generated Riverpod parts, but never overwrite committed upstream files.
    # Commands still run pub/generation before analysis after a preparation.
    if marker.exists() and json.loads(marker.read_text()).get("upstream") == pinned:
        for directory in (".dart_tool", "build"):
            if (SOURCE / directory).is_dir():
                shutil.copytree(SOURCE / directory, stage / directory, dirs_exist_ok=True)
        for path in (SOURCE / "lib").rglob("*.g.dart"):
            target = stage / path.relative_to(SOURCE)
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)
    # Replacing this GENERATED directory never touches the repository's services.
    previous = SOURCE.with_name("previous")
    shutil.rmtree(previous, ignore_errors=True)
    if SOURCE.exists():
        SOURCE.rename(previous)
    stage.rename(SOURCE)
    shutil.rmtree(previous, ignore_errors=True)
    print(f"Prepared NEXUS native source: {SOURCE.relative_to(ROOT)}")
    return SOURCE


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--origin", required=True)
    parser.add_argument("--bundle-id", default="dev.nexus.client")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    try:
        prepare(args.origin, args.bundle_id, args.offline, args.refresh)
    except (OSError, ValueError, RuntimeError) as error:
        print(f"NEXUS native preparation failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
