#!/usr/bin/env python3
"""Prepare (but never push) a client-build snapshot without private history/data.

The main worktree, its index, deployment assets and original history are untouched.
Large profile media stays out of Git; the snapshot receives only its SHA manifest.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tempfile

from profile_media_inputs import validate_manifest

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "generated-artifacts" / "windows-build"
WORKFLOW = ".github/workflows/windows-private-test.yaml"


def include_path(path):
    if path.startswith((
        ".agents/", ".local/", ".nexus/", ".config/", ".devcontainer/",
        "dumps/", "generated-artifacts/", "node_modules/", "artifacts/",
        "deploy/self-hosting/app-static/",
    )):
        return False
    if "/node_modules/" in path:
        return False
    if path.startswith("attached_assets/") and not path.startswith("attached_assets/generated_images/"):
        return False
    if path.startswith(".github/workflows/") and path != WORKFLOW:
        return False
    name = PurePosixPath(path).name
    if path in (".replit", ".replitignore", ".envrc"):
        return False
    if name == ".env" or name.startswith(".env.") or name.endswith(".env"):
        return name.endswith((".example", ".sample", ".template"))
    return True


def git(*args, input=None, index=None):
    env = dict(os.environ)
    if index:
        env["GIT_INDEX_FILE"] = str(index)
    return subprocess.check_output(
        ["git", *args], cwd=ROOT, input=input, env=env,
    )


def prepare(manifest_path, parent):
    if len(parent) != 40 or any(c not in "0123456789abcdef" for c in parent):
        raise ValueError("An explicit existing remote parent revision is required.")
    git("cat-file", "-e", parent)
    manifest_bytes = manifest_path.read_bytes()
    manifest = validate_manifest(json.loads(manifest_bytes))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = git("rev-parse", "HEAD").decode().strip()
    tracked_changes = git("diff", "HEAD", "--name-only").decode().strip()
    if tracked_changes:
        raise ValueError("Commit the intended source changes before preparing the build snapshot.")
    with tempfile.TemporaryDirectory(dir=OUTPUT) as folder:
        index = Path(folder) / "snapshot.index"
        git("read-tree", source, index=index)
        paths = git("ls-files", "-z", index=index).decode().split("\0")
        excluded = [p for p in paths if p and not include_path(p)]
        git("update-index", "--force-remove", "-z", "--stdin",
            input=("\0".join(excluded) + "\0").encode(), index=index)
        blob = git("hash-object", "-w", "--stdin", input=manifest_bytes).decode().strip()
        entry = f"100644 {blob}\t.nexus-build/profile-media.json\0".encode()
        git("update-index", "-z", "--index-info", input=entry, index=index)
        tree = git("write-tree", index=index).decode().strip()
        commit = git(
            "-c", "user.name=NEXUS Build Preparation",
            "-c", "user.email=build@nexus.invalid",
            "commit-tree", tree, "-p", parent, "-m",
            "Prepare sanitized NEXUS Windows client build inputs; no private development configuration",
        ).decode().strip()
        ref = f"refs/heads/nexus-build-candidate/{source[:12]}"
        git("update-ref", ref, commit, "0" * 40)
    value = {
        "schema": 1, "scope": "Windows client build, not a complete server distribution",
        "sourceRevision": source, "candidateRevision": commit, "candidateRef": ref,
        "parent": parent, "excludedPaths": excluded,
        "profileAssetCount": len(manifest["files"]),
        "profileManifestSHA256": hashlib.sha256(manifest_bytes).hexdigest(),
        "privateHistoryUploaded": False,
        "pushed": False,
    }
    path = OUTPUT / "candidate.json"
    path.write_text(json.dumps(value, indent=2) + "\n")
    print(f"Prepared client-only candidate {commit}; {len(excluded)} local/configuration paths excluded.")
    print(f"Audit metadata: {path.relative_to(ROOT)}. Nothing was pushed.")
    return value


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile-manifest", required=True, type=Path)
    parser.add_argument("--parent", required=True)
    args = parser.parse_args()
    prepare(args.profile_manifest, args.parent)
