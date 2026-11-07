#!/usr/bin/env bash
# SPDX-License-Identifier: Nebula

set -euo pipefail

if [ -x "${NEXUS_CI_BIN:-}" ]; then
	exec "$NEXUS_CI_BIN" "$@"
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
exec cargo run --quiet --manifest-path "$script_dir/Cargo.toml" -- "$@"
