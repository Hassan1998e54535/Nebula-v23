"""Reproducible upstream inputs; large archives and assets never enter Git."""

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
MOBILE = ROOT / "nexus_mobile"
CACHE = ROOT / "generated-artifacts/nexus-mobile/downloads"
SOURCE = ROOT / "generated-artifacts/nexus-mobile/source"


def digest(path):
    value = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def lock():
    return json.loads((MOBILE / "upstream.lock.json").read_text())


def archive(name, entry, offline=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{name}.tar.gz"
    expected = entry["sha256"]
    if not expected or len(expected) != 64:
        raise ValueError(f"{name}: missing pinned SHA-256")
    if path.exists() and digest(path) == expected:
        return path
    if offline:
        raise RuntimeError(f"{name}: verified archive not cached; run without --offline")
    url = f"https://codeload.github.com/{entry['repository']}/tar.gz/{entry['revision']}"
    temporary = path.with_suffix(".download")
    try:
        with urllib.request.urlopen(url, timeout=120) as response, temporary.open("wb") as output:
            while block := response.read(1024 * 1024):
                output.write(block)
        if digest(temporary) != expected:
            raise RuntimeError(f"{name}: archive checksum mismatch; refusing unverified source")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return path


def unpack(path, destination, selected=None):
    """Extract regular files only, without archive roots, links, or traversal."""
    destination = Path(destination)
    with tarfile.open(path) as source:
        for member in source:
            parts = PurePosixPath(member.name).parts
            if not parts or any(p in ("..", "") for p in parts) or member.name.startswith("/"):
                raise ValueError(f"Unsafe archive entry: {member.name}")
            relative = PurePosixPath(*parts[1:])
            if str(relative) == ".":
                continue
            if member.issym() or member.islnk():
                # Android Gradle links are not required; no upstream link may
                # escape the generated workspace or reference another checkout.
                continue
            if not member.isfile() or selected is not None and not selected(relative):
                continue
            target = destination.joinpath(*relative.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.extractfile(member) as content, target.open("wb") as output:
                while block := content.read(1024 * 1024):
                    output.write(block)
            target.chmod(0o755 if member.mode & 0o111 else 0o644)
