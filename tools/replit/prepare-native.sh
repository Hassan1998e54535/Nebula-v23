#!/usr/bin/env bash
# Provision pinned build tools into ignored directories; no containers required.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
mkdir -p .nexus/bin .nexus/tooling
if [[ ! -x .nexus/tooling/node_modules/.bin/pnpm ]]; then
  npm install --prefix .nexus/tooling --no-audit --no-fund pnpm@11.27.0
fi
export PATH="$PWD/.nexus/tooling/node_modules/.bin:$PATH"
if [[ ! -x .nexus/bin/weed ]]; then
  curl -fsSL --retry 3 \
    https://github.com/seaweedfs/seaweedfs/releases/download/4.47/linux_amd64.tar.gz \
    | tar xz -C .nexus/bin weed
fi
if [[ ! -x .nexus/bin/wasm-bindgen ]]; then
  curl -fsSL --retry 3 \
    https://github.com/wasm-bindgen/wasm-bindgen/releases/download/0.2.128/wasm-bindgen-0.2.128-x86_64-unknown-linux-musl.tar.gz \
    | tar xz -C .nexus/bin --strip-components=1 \
      wasm-bindgen-0.2.128-x86_64-unknown-linux-musl/wasm-bindgen
fi
if ! rustup run stable rustc --version >/dev/null 2>&1; then
  rustup toolchain install stable --profile minimal
fi
rustup default stable
rustup target add --toolchain stable wasm32-unknown-unknown
if [[ ! -f node_modules/.pnpm/lock.yaml ]]; then
  CI=true pnpm install --frozen-lockfile
fi
