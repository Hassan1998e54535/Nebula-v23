#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Regenerate the disposable static cache from the owner's source bundles.
# This does not rebuild the application or the development container.
if [[ -f tools/replit/prepare-profile-media.py ]] && command -v python3 >/dev/null 2>&1; then
  if ! python3 tools/replit/prepare-profile-media.py; then
    echo "Profile media cache could not be prepared; uploaded artwork may be unavailable." >&2
  fi
fi

mode="${1:-host}"
if [[ "$mode" == "workspace" ]]; then
  : "${REPLIT_DEV_DOMAIN:?REPLIT_DEV_DOMAIN must be set by the Replit workspace}"

  for attempt in {1..60}; do
    if pg_isready -q -h postgres -p 5432 -U nexus -d nexus; then
      break
    fi
    sleep 1
  done
  pg_isready -h postgres -p 5432 -U nexus -d nexus

  public_origin="https://${REPLIT_DEV_DOMAIN}"
  export NEXUS_BASE_DOMAIN="$REPLIT_DEV_DOMAIN"
  export NEXUS_STATIC_CDN_DOMAIN="$REPLIT_DEV_DOMAIN"
  export NEXUS_PUBLIC_SCHEME=https
  export NEXUS_PUBLIC_PORT=443
  export NEXUS_PUBLIC_ORIGIN="$public_origin"
  export NEXUS_PUBLIC_URL="$public_origin"
  export NEXUS_API_ENDPOINT="${public_origin}/api"
  export NEXUS_API_CLIENT_ENDPOINT="${public_origin}/api"
  export NEXUS_APP_ENDPOINT="$public_origin"
  export NEXUS_MARKETING_ENDPOINT="$public_origin"
  export NEXUS_GATEWAY_ENDPOINT="wss://${REPLIT_DEV_DOMAIN}/gateway"
  export NEXUS_MEDIA_ENDPOINT="${public_origin}/media"
  export NEXUS_STATIC_CDN_ENDPOINT="$public_origin"
  export NEXUS_ADMIN_ENDPOINT="${public_origin}/admin"
  export NEXUS_MEDIA_PROXY_PUBLIC_ENDPOINT="${public_origin}/media"
  export NEXUS_S3_PUBLIC_ENDPOINT="$public_origin"
  if [[ -n "${LIVEKIT_URL:-}" && -n "${LIVEKIT_API_KEY:-}" && -n "${LIVEKIT_API_SECRET:-}" ]]; then
    livekit_url="${LIVEKIT_URL%/}"
    case "$livekit_url" in
      wss://*)
        livekit_internal_url="https://${livekit_url#wss://}"
        ;;
      https://*)
        livekit_url="wss://${livekit_url#https://}"
        livekit_internal_url="https://${livekit_url#wss://}"
        ;;
      *)
        echo "LiveKit configuration requires a secure wss:// or https:// URL."
        exit 1
        ;;
    esac

    export NEXUS_LIVEKIT_ENABLED=true
    export NEXUS_LIVEKIT_URL="$livekit_url"
    export NEXUS_LIVEKIT_INTERNAL_URL="$livekit_internal_url"
    export NEXUS_LIVEKIT_API_KEY="$LIVEKIT_API_KEY"
    export NEXUS_LIVEKIT_API_SECRET="$LIVEKIT_API_SECRET"
    echo "NEXUS voice is configured to use the supplied LiveKit endpoint."
  else
    export NEXUS_LIVEKIT_URL="wss://${REPLIT_DEV_DOMAIN}/livekit"
  fi

  export NEXUS_MEDIA_PROXY_UPLOAD_RELAY_ENDPOINT="${public_origin}/media"
  export NEXUS_GATEWAY_MEDIA_PROXY_ENDPOINT="${public_origin}/media"
  export NEXUS_GATEWAY_STATIC_CDN_ENDPOINT="$public_origin"
  export NEXUS_ADMIN_OAUTH_REDIRECT_URI="${public_origin}/admin/oauth2_callback"
  export NEXUS_PASSKEY_RP_ID="$REPLIT_DEV_DOMAIN"
  export NEXUS_PASSKEY_ADDITIONAL_ALLOWED_ORIGINS="$public_origin"

  # Use the checked-in Mailpit defaults only for local development, never in the Replit preview.
  # When a complete external SMTP configuration is supplied through Replit environment variables,
  # make it authoritative over any older email settings stored in the instance database.
  export NEXUS_EMAIL_ENV_OVERRIDE=true
  if [[ "${NEXUS_EMAIL_ENABLED:-}" != "true" ||
        "${NEXUS_EMAIL_PROVIDER:-}" != "smtp" ||
        -z "${NEXUS_EMAIL_FROM_EMAIL:-}" ||
        -z "${NEXUS_EMAIL_FROM_NAME:-}" ||
        -z "${NEXUS_EMAIL_SMTP_HOST:-}" ||
        -z "${NEXUS_EMAIL_SMTP_PORT:-}" ||
        -z "${NEXUS_EMAIL_SMTP_USERNAME:-}" ||
        -z "${NEXUS_EMAIL_SMTP_PASSWORD:-}" ||
        -z "${NEXUS_EMAIL_SMTP_TLS_MODE:-}" ]]; then
    export NEXUS_EMAIL_ENABLED=false
    echo "NEXUS email is disabled in this Replit preview until a complete SMTP configuration is provided."
  else
    echo "NEXUS will use the SMTP configuration supplied to this Replit preview."
  fi

  bash .devcontainer/fix-docker-socket.sh
  bash .devcontainer/fix-workspace-permissions.sh
  cargo run -p nexus-dev -- bootstrap
  exec pnpm dev
fi

if [[ "$mode" != "host" ]]; then
  echo "Usage: $0 [host|workspace]" >&2
  exit 2
fi

: "${REPLIT_DEV_DOMAIN:?REPLIT_DEV_DOMAIN must be available in the Replit workflow}"
export NEXUS_DEV_PROXY_PORT=5000

# Replit can retry an auto-started workflow while an earlier host runner is
# still serving the preview. Serialize host runners so they reuse the fixed
# port instead of racing to bind it.
preview_lock_file="${TMPDIR:-/tmp}/nexus-replit-preview-5000.lock"
exec 9>"$preview_lock_file"
if ! flock -n 9; then
  echo "Another NEXUS preview runner owns port 5000; waiting for it to exit."
  flock 9
fi

compose=(
  docker compose
  -f .devcontainer/docker-compose.yml
  -f .devcontainer/docker-compose.replit.yml
)
if [[ "${NEXUS_REBUILD_DEV_IMAGE:-0}" == "1" ]]; then
  echo "Explicitly rebuilding the NEXUS development workspace image."
  "${compose[@]}" build workspace
fi
logs_pid=""
proxy_pid=""
cleanup() {
  if [[ -n "$proxy_pid" ]]; then
    kill "$proxy_pid" 2>/dev/null || true
    wait "$proxy_pid" 2>/dev/null || true
  fi
  kill "$logs_pid" 2>/dev/null || true
  wait "$logs_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 0' INT TERM

# Bind Replit's required webview port before starting the workspace. This keeps
# the workflow detectable even if Docker or the frontend takes a long time.
# The proxy serves a retry page until the app shell and bootstrap assets are ready.
echo "Starting the NEXUS preview proxy on port 5000; it will show a retry page until the app is ready."
node tools/replit/preview-proxy.mjs &
proxy_pid=$!
"${compose[@]}" up --no-build -d workspace
"${compose[@]}" logs --follow --tail=50 workspace 9>&- &
logs_pid=$!
wait "$proxy_pid"
