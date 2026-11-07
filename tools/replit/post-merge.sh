#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PNPM="$ROOT/.nexus/tooling/node_modules/.bin/pnpm"
if [[ ! -x "$PNPM" ]]; then
  npm install --prefix "$ROOT/.nexus/tooling" --no-audit --no-fund pnpm@11.27.0
fi

"$PNPM" install --frozen-lockfile
