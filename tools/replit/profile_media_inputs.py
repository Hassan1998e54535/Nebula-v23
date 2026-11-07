#!/usr/bin/env python3
"""Restore only already-served public rendering assets, never source ZIPs.

The development origin is a temporary build input, NOT the client's backend.
Every file is pinned by size and SHA-256. No credentials or application data are
read, and no generated media is added to Git.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path, PurePosixPath
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "generated-artifacts" / "profile-media"
MANIFEST = ROOT / ".nexus-build" / "profile-media.json"
MAX_FILE_BYTES = 100 * 1024 * 1024
MAX_TOTAL_BYTES = 512 * 1024 * 1024
DOWNLOAD_TIMEOUT_SECONDS = 300
DOWNLOAD_CHUNK_BYTES = 1024 * 1024
DOWNLOAD_WORKERS = 2
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".webm", ".mp4", ".riv", ".glb", ".woff2", ".md"}


def validate_manifest(value):
    if value.get("schema") != 1 or not isinstance(value.get("files"), list):
        raise ValueError("Unsupported profile-media input manifest.")
    origin = urlsplit(value.get("assetOrigin", ""))
    if (origin.scheme != "https" or not origin.hostname or origin.username
            or origin.password or origin.path not in ("", "/")
            or origin.query or origin.fragment):
        raise ValueError("Asset input origin must be a credential-free HTTPS origin.")
    seen, total = set(), 0
    if not 1 <= len(value["files"]) <= 1000:
        raise ValueError("Unexpected profile-media input count.")
    for entry in value["files"]:
        name = entry.get("path", "")
        path = PurePosixPath(name)
        if (not name or path.is_absolute() or "\\" in name or ":" in name
                or any(part in (".", "..", "") for part in name.split("/"))
                or path.suffix.lower() not in EXTENSIONS or name in seen):
            raise ValueError("Unsafe or duplicate profile-media input path.")
        size, digest = entry.get("bytes"), entry.get("sha256", "")
        if (not isinstance(size, int) or isinstance(size, bool) or not 0 <= size <= MAX_FILE_BYTES
                or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest)):
            raise ValueError("Invalid profile-media input size or digest.")
        seen.add(name)
        total += size
    if total > MAX_TOTAL_BYTES:
        raise ValueError("Profile-media inputs exceed the build size limit.")
    return value


def matches(path, entry):
    return (path.is_file() and path.stat().st_size == entry["bytes"]
            and hashlib.sha256(path.read_bytes()).hexdigest() == entry["sha256"])


def verify_cache(cache, manifest):
    validate_manifest(manifest)
    for entry in manifest["files"]:
        path = cache / entry["path"]
        if not path.resolve().is_relative_to(cache.resolve()) or not matches(path, entry):
            raise ValueError(f"Missing or modified required profile asset: {entry['path']}")
    return len(manifest["files"])


def restore(cache, manifest, opener=urlopen, sleeper=time.sleep):
    validate_manifest(manifest)
    cache.mkdir(parents=True, exist_ok=True)

    def download(entry):
        destination = cache / entry["path"]
        if not destination.resolve().is_relative_to(cache.resolve()):
            raise ValueError("Profile-media destination escapes the generated cache.")
        if matches(destination, entry):
            return
        destination.parent.mkdir(parents=True, exist_ok=True)
        url = manifest["assetOrigin"].rstrip("/") + "/assets/profile-media/" + quote(entry["path"], safe="/")
        for attempt in range(7):
            temporary = None
            try:
                with opener(url, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
                    with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as output:
                        temporary = Path(output.name)
                        digest = hashlib.sha256()
                        received = 0
                        while received <= entry["bytes"]:
                            chunk = response.read(min(
                                DOWNLOAD_CHUNK_BYTES,
                                entry["bytes"] + 1 - received,
                            ))
                            if not chunk:
                                break
                            output.write(chunk)
                            digest.update(chunk)
                            received += len(chunk)
                if received != entry["bytes"] or digest.hexdigest() != entry["sha256"]:
                    raise ValueError(f"Profile asset download did not match the original: {entry['path']}")
                temporary.replace(destination)
                return
            except HTTPError as error:
                if error.code not in (408, 429, 500, 502, 503, 504) or attempt == 6:
                    raise RuntimeError(
                        f"Profile-media download failed for {entry['path']} "
                        f"(HTTP {error.code}; attempt {attempt + 1}/7)."
                    ) from error
                sleeper(min(2 ** attempt, 30))
            except (URLError, TimeoutError) as error:
                if attempt == 6:
                    raise RuntimeError(
                        f"Profile-media download stalled for {entry['path']} "
                        f"after {attempt + 1} attempts ({type(error).__name__})."
                    ) from error
                sleeper(min(2 ** attempt, 30))
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        list(pool.map(download, manifest["files"]))
    return verify_cache(cache, manifest)


def create_manifest(cache, origin):
    files = []
    for path in sorted(cache.rglob("*")):
        if path.is_file() and path.suffix.lower() in EXTENSIONS:
            if not path.resolve().is_relative_to(cache.resolve()):
                raise ValueError("Cannot export profile assets outside the generated cache.")
            files.append({
                "path": path.relative_to(cache).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            })
    return validate_manifest({
        "schema": 1,
        "purpose": "temporary rendering build inputs, not a backend address",
        "assetOrigin": origin,
        "files": files,
    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    parser.add_argument("--create", metavar="HTTPS_ASSET_ORIGIN")
    args = parser.parse_args()
    if args.create:
        value = create_manifest(CACHE, args.create)
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(value, indent=2) + "\n")
        print(f"Locked {len(value['files'])} original rendering assets; no media binary was copied to Git.")
    else:
        count = restore(CACHE, json.loads(args.manifest.read_text()))
        print(f"Verified {count} original rendering assets from the temporary build input.")


if __name__ == "__main__":
    main()
