#!/usr/bin/env bash
# Run the existing development stack without Docker.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
ROOT="$PWD"
: "${REPLIT_DEV_DOMAIN:?Run this script through the Replit workflow}"
export PATH="$ROOT/.nexus/tooling/node_modules/.bin:$HOME/.local/node_modules/.bin:$ROOT/.nexus/bin:$HOME/.cargo/bin:$PATH"
export CARGO_BUILD_JOBS=3
export NEXUS_DEV_GATEWAY_READY_TIMEOUT=900
export NEXUS_DEV_RUST_SERVICE_READY_TIMEOUT=900
export NEXUS_DEV_API_READY_TIMEOUT=300
# The Replit certificate directory can be empty; point Rustls and native TLS at
# the system bundle so outbound HTTPS and gateway TLS can load trusted roots.
if [[ -z "${SSL_CERT_FILE:-}" && -r /etc/ssl/certs/ca-certificates.crt ]]; then
  export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
fi
export GLIBC_TUNABLES=glibc.rtld.optional_static_tls=65536
export ERL_FLAGS="+S 2:2 +SDcpu 1 +SDio 1"
# Do not inject the native glibc headers into C libraries compiled for WebAssembly.
export CFLAGS_wasm32_unknown_unknown=""
export CC_wasm32_unknown_unknown="$(command -v clang)"
clang_prefix="$(dirname "$(dirname "$CC_wasm32_unknown_unknown")")"
if [[ -f "$clang_prefix/nix-support/orig-cc" ]]; then
  export CC_wasm32_unknown_unknown="$(cat "$clang_prefix/nix-support/orig-cc")/bin/clang"
fi
export AR_wasm32_unknown_unknown="$(command -v llvm-ar)"
export NEXUS_DEV_PROXY_PORT=8088
export NEXUS_SELF_HOSTED=true
# Replit's development database is intentionally separate from the original
# Docker-based development database configured in config/env/development.env.
: "${DATABASE_URL:?Replit development PostgreSQL DATABASE_URL is required}"
export NEXUS_DATABASE_BACKEND=postgres
export NEXUS_POSTGRES_URL="$DATABASE_URL"
export NEXUS_KV_URL=redis://127.0.0.1:6379
export NEXUS_NATS_URL=nats://127.0.0.1:4222
export NEXUS_NATS_JETSTREAM_URL=nats://127.0.0.1:4222
export NEXUS_SVC_NATS_URL=nats://127.0.0.1:4222
export NEXUS_SEARCH_ENGINE=meilisearch
export NEXUS_SEARCH_URL=http://127.0.0.1:7700

state="$ROOT/.nexus/replit"
mkdir -p "$state"
pids=()
dev_pid=""
cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$dev_pid" ]] && kill -0 "$dev_pid" 2>/dev/null; then
    kill -INT "$dev_pid" 2>/dev/null || true
    for _ in {1..100}; do
      kill -0 "$dev_pid" 2>/dev/null || break
      sleep 0.1
    done
    if kill -0 "$dev_pid" 2>/dev/null; then
      kill -TERM "$dev_pid" 2>/dev/null || true
      for _ in {1..50}; do
        kill -0 "$dev_pid" 2>/dev/null || break
        sleep 0.1
      done
    fi
    if kill -0 "$dev_pid" 2>/dev/null; then
      kill -KILL "$dev_pid" 2>/dev/null || true
    fi
  fi
  for pid in "${pids[@]}"; do
    [[ "$pid" == "$dev_pid" ]] || kill "$pid" 2>/dev/null || true
  done
  wait || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM
start() {
  local name="$1"; shift
  "$@" >"$state/$name.log" 2>&1 &
  pids+=("$!")
}
start preview node tools/replit/preview-proxy.mjs
bash tools/replit/prepare-native.sh
start valkey valkey-server --bind 127.0.0.1 --save "" --appendonly no
start nats nats-server -a 127.0.0.1 -js -sd "$state/nats" -m 8222
# This key is the repository's public development-only default, not a credential.
start search meilisearch --http-addr 127.0.0.1:7700 --db-path "$state/search" \
  --master-key nexus-dev-meilisearch --no-analytics

# Keep public endpoints on the preview's same origin.
origin="https://$REPLIT_DEV_DOMAIN"
# The managed local SeaweedFS instance uses these development-only credentials.
# Keep the API/bootstrap client aligned with tools/dev/src/media_proxy.rs.
export NEXUS_S3_ACCESS_KEY_ID=nexus
export NEXUS_S3_SECRET_ACCESS_KEY=nexus-secret
# Web push is not configured for this local preview. Keep the API's required
# VAPID validation satisfied with the public test pair already used by config
# tests; never use this pair in a published deployment.
export NEXUS_VAPID_PUBLIC_KEY='BB76bTFIuoqmxJtTfZX0yGTn1f_qu9H03B_nkj8OyExJFkN7Y-HBZZzShnHZoEhXKc5ZRy3jFu7OkBbnaQG-4aw'
export NEXUS_VAPID_PRIVATE_KEY='Xgi-3P8J-I3Q6U1HlCcXMuc_tKLGAM9nIfznX3Hz68o'
export NEXUS_VAPID_EMAIL=dev@nexus.invalid
export NEXUS_BASE_DOMAIN="$REPLIT_DEV_DOMAIN"
export NEXUS_STATIC_CDN_DOMAIN="$REPLIT_DEV_DOMAIN"
export NEXUS_PUBLIC_SCHEME=https NEXUS_PUBLIC_PORT=443
export NEXUS_PUBLIC_ORIGIN="$origin" NEXUS_PUBLIC_URL="$origin"
export NEXUS_API_ENDPOINT="$origin/api" NEXUS_API_CLIENT_ENDPOINT="$origin/api"
export NEXUS_APP_ENDPOINT="$origin" NEXUS_MARKETING_ENDPOINT="$origin"
export NEXUS_GATEWAY_ENDPOINT="wss://$REPLIT_DEV_DOMAIN/gateway"
export NEXUS_MEDIA_ENDPOINT="$origin/media" NEXUS_STATIC_CDN_ENDPOINT="$origin"
export NEXUS_ADMIN_ENDPOINT="$origin/admin" NEXUS_S3_PUBLIC_ENDPOINT="$origin"
export NEXUS_MEDIA_PROXY_PUBLIC_ENDPOINT="$origin/media"
export NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT="$origin/media"
export NEXUS_GATEWAY_MEDIA_PROXY_ENDPOINT="$origin/media"
export NEXUS_GATEWAY_STATIC_CDN_ENDPOINT="$origin"
export NEXUS_ADMIN_OAUTH_REDIRECT_URI="$origin/admin/oauth2_callback"
export NEXUS_PASSKEY_RP_ID="$REPLIT_DEV_DOMAIN"
export NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS="$origin"

if [[ -n "${LIVEKIT_URL:-}" && -n "${LIVEKIT_API_KEY:-}" && -n "${LIVEKIT_API_SECRET:-}" ]]; then
  case "$LIVEKIT_URL" in
    wss://*) export NEXUS_LIVEKIT_URL="${LIVEKIT_URL%/}"
             export NEXUS_LIVEKIT_INTERNAL_URL="https://${NEXUS_LIVEKIT_URL#wss://}" ;;
    https://*) export NEXUS_LIVEKIT_INTERNAL_URL="${LIVEKIT_URL%/}"
               export NEXUS_LIVEKIT_URL="wss://${NEXUS_LIVEKIT_INTERNAL_URL#https://}" ;;
    *) echo "LIVEKIT_URL must use wss:// or https://" >&2; exit 1 ;;
  esac
  export NEXUS_LIVEKIT_ENABLED=true
  export NEXUS_LIVEKIT_API_KEY="$LIVEKIT_API_KEY"
  export NEXUS_LIVEKIT_API_SECRET="$LIVEKIT_API_SECRET"
else
  export NEXUS_LIVEKIT_ENABLED=false
  echo "Voice is disabled until all three LiveKit settings are supplied."
fi

export NEXUS_EMAIL_ENV_OVERRIDE=true
if [[ "${NEXUS_EMAIL_ENABLED:-}" != true || "${NEXUS_EMAIL_PROVIDER:-}" != smtp ||
      -z "${NEXUS_EMAIL_FROM_EMAIL:-}" || -z "${NEXUS_EMAIL_FROM_NAME:-}" ||
      -z "${NEXUS_EMAIL_SMTP_HOST:-}" || -z "${NEXUS_EMAIL_SMTP_PORT:-}" ||
      -z "${NEXUS_EMAIL_SMTP_USERNAME:-}" || -z "${NEXUS_EMAIL_SMTP_PASSWORD:-}" ||
      -z "${NEXUS_EMAIL_SMTP_TLS_MODE:-}" ]]; then
  export NEXUS_EMAIL_ENABLED=false
  echo "Email is disabled until the external SMTP settings are complete."
fi

if ! python3 tools/replit/prepare-profile-media.py; then
  echo "Profile media cache could not be prepared; uploaded artwork may be unavailable." >&2
fi
cargo build -p nexus-dev --locked
# Infrastructure and S3 checks in the existing bootstrap assume Docker DNS.
# Native services use loopback; retain the existing schema and bucket setup.
target/debug/nexus-dev post-start
target/debug/nexus-dev dev &
dev_pid="$!"
pids+=("$dev_pid")
wait "$dev_pid"
