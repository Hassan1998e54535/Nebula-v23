#!/usr/bin/env python3
"""Check source/local-data boundaries without reading credential values.

This is an inventory and ignore-policy check, not a secret scanner, application
test, or permission to publish the repository.
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
LOCAL_ROOTS = (
    ".local/",
    ".nexus/",
    ".pythonlibs/",
    "generated-artifacts/",
    "node_modules/",
    "dumps/",
)
SOURCE_DEFAULTS = {"config/env/development.env"}
POLICY_CASES = {
    ".local/tasks/example.md": True,
    ".nexus/data/example.db": True,
    "dumps/example.sql": True,
    "generated-artifacts/example.json": True,
    "node_modules/example/index.js": True,
    ".pythonlibs/example.py": True,
    ".env.production": True,
    "nexus_api/.env.production": True,
    "config/env/local.env": True,
    "attached_assets/IMG_example.png": True,
    "attached_assets/Pasted-example.txt": True,
    "deploy/self-hosting/.env.example": False,
    "config/env/development.env": False,
    "attached_assets/generated_images/nexus-portrait-1.png": False,
    ".github/workflows/windows-private-test.yaml": False,
    ".github/workflows/nexus-mobile-ios.yml": False,
}
REQUIRED_PATHS = (
    "nexus_app/src",
    "nexus_api/src",
    "nexus_desktop/electron-builder.config.cjs",
    "nexus_mobile/upstream.lock.json",
    "deploy/self-hosting/docker-compose.yml",
    "deploy/self-hosting/app-static",
    ".github/workflows/windows-private-test.yaml",
    ".github/workflows/nexus-mobile-ios.yml",
)


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, timeout=30
    )


def is_private_env(path: str) -> bool:
    if path in SOURCE_DEFAULTS:
        return False
    name = Path(path).name
    if name in {".env.example", ".env.sample", ".env.template"}:
        return False
    if name.endswith(".example"):
        return False
    return name == ".env" or name.startswith(".env.") or name.endswith(".env")


def main() -> int:
    problems = []
    for path, expected_ignored in POLICY_CASES.items():
        # Test project rules even on a machine without Replit's global ignores.
        result = git(
            "-c", "core.excludesFile=/dev/null",
            "check-ignore", "--no-index", "-q", "--", path,
        )
        if result.returncode not in (0, 1):
            problems.append(f"Cannot inspect ignore policy: {path}")
        elif (result.returncode == 0) != expected_ignored:
            problems.append(f"Unexpected ignore policy: {path}")

    tracked = git("ls-files", "-z")
    if tracked.returncode:
        problems.append("Cannot inventory saved source files.")
        paths = []
    else:
        paths = [p for p in tracked.stdout.decode().split("\0") if p]
    for path in paths:
        if (
            path.startswith(LOCAL_ROOTS)
            or "/node_modules/" in path
            or is_private_env(path)
            or (
                path.startswith("attached_assets/")
                and not path.startswith("attached_assets/generated_images/")
            )
        ):
            problems.append(f"Local-only path is tracked: {path}")

    for path in REQUIRED_PATHS:
        if not (ROOT / path).exists():
            problems.append(f"Required source/runtime path missing: {path}")
    for problem in problems:
        print(problem, file=sys.stderr)
    if problems:
        return 1
    print(f"Repository boundary checks passed: {len(paths)} tracked files.")
    print("Development defaults still require secret review before publication.")
    print("No files were changed, deleted, or uploaded by this check.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
