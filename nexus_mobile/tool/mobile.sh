#!/usr/bin/env bash
# Native Flutter commands only. This does not start/replace the web workflow.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMMAND="${1:-help}"
[[ $# -eq 0 ]] || shift
if [[ "$COMMAND" == help ]]; then
  cat <<'HELP'
Usage:
  bash nexus_mobile/tool/mobile.sh prepare --origin https://YOUR-HOST [--bundle-id dev.nexus.client]
  bash nexus_mobile/tool/mobile.sh deps [--offline]
  bash nexus_mobile/tool/mobile.sh check|test|live|run-ios|build-ios|archive-ios [Flutter options...]

Prepare first. The generated source is under generated-artifacts/nexus-mobile/source.
The development bundle ID is not a registered Apple distribution identity.
build-ios builds an UNSIGNED .app on macOS, NOT an installable iPhone IPA.
archive-ios requires your own signing setup, NEXUS_DEVELOPMENT_TEAM and
NEXUS_EXPORT_OPTIONS_PLIST. It does not upload or publish anything.
HELP
  exit 0
fi
if [[ "$COMMAND" == prepare ]]; then
  exec python3 "$ROOT/nexus_mobile/tool/prepare.py" "$@"
fi
SOURCE="$ROOT/generated-artifacts/nexus-mobile/source"
[[ -r "$SOURCE/.nexus-prepared.json" ]] || {
  echo "Prepare the NEXUS client with an HTTPS origin first." >&2; exit 1;
}
FLUTTER="${FLUTTER_BIN:-$(command -v flutter || true)}"
if [[ -z "${FLUTTER_BIN:-}" && -x "$ROOT/generated-artifacts/toolchains/flutter/bin/flutter" ]]; then
  FLUTTER="$ROOT/generated-artifacts/toolchains/flutter/bin/flutter"
fi
[[ -n "$FLUTTER" ]] || { echo "Install the pinned Flutter SDK or set FLUTTER_BIN." >&2; exit 1; }
export PATH="$(dirname "$FLUTTER"):$PATH"
if [[ "$(uname)" == Linux ]]; then
  # Same compiler/runtime requirements as the existing NEXUS native launcher.
  export GLIBC_TUNABLES=glibc.rtld.optional_static_tls=65536
  export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
fi
python3 - "$FLUTTER" <<'PY'
import json, subprocess, sys
v=json.loads(subprocess.check_output([sys.argv[1],"--version","--machine"]))
if tuple(map(int,v["dartSdkVersion"].split(" ")[0].split(".")[:2])) < (3,12):
    raise SystemExit("This client needs Dart >=3.12 / Flutter 3.47.9; do not downgrade its dependencies.")
PY
ORIGIN="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["origin"])' "$SOURCE/.nexus-prepared.json")"
GATEWAY="wss://${ORIGIN#https://}/gateway"
cd "$SOURCE"
if [[ "$COMMAND" == deps ]]; then
  # Native iOS uses APNs, not upstream Firebase project settings or store billing.
  dart tool/configure_build.dart --profile=oss
  bash tool/apply_macos_pub_overrides.sh
  "$FLUTTER" pub get "$@"
  "$FLUTTER" gen-l10n
  # Avoid build_runner's AOT bootstrap, which stalls in the constrained Linux
  # workspace. JIT changes the generator execution mode, not the app's release
  # compilation, features, or dependency versions.
  dart run build_runner build --force-jit
  exit 0
fi
[[ -r .dart_tool/package_config.json ]] || {
  echo "Run 'bash nexus_mobile/tool/mobile.sh deps' first." >&2; exit 1;
}
DEFINES=(
  "--dart-define=APP_ENVIRONMENT=stable"
  "--dart-define=PUSH_PROVIDER=apns"
  "--dart-define=OBSERVABILITY_REPORTING=false"
  "--dart-define=NEXUS_ORIGIN=$ORIGIN"
  "--dart-define=NEXUS_GATEWAY=$GATEWAY"
)
for KEY in NEXUS_HELP_URL NEXUS_FEEDBACK_URL NEXUS_COMMUNITY_INVITE \
  NEXUS_TERMS_URL NEXUS_PRIVACY_URL NEXUS_STATUS_URL \
  NEXUS_RELEASE_NOTES_URL NEXUS_DOWNLOAD_URL NEXUS_APP_STORE_URL; do
  [[ -z "${!KEY:-}" ]] || DEFINES+=("--dart-define=$KEY=${!KEY}")
done
case "$COMMAND" in
  check) exec "$FLUTTER" analyze lib/core/build/nexus_configuration.dart \
    lib/core/instance lib/core/theme/themes/dark.dart \
    lib/features/ui/icons/fluxer_brand_logo.dart test/nexus "$@" ;;
  test) exec "$FLUTTER" test test/nexus "${DEFINES[@]}" "$@" ;;
  live) exec "$FLUTTER" test test/nexus/live_backend_test.dart "${DEFINES[@]}" \
    "--dart-define=NEXUS_LIVE_SMOKE=true" "$@" ;;
  run-ios) [[ "$(uname)" == Darwin ]] || { echo "Running iOS requires macOS/Xcode." >&2; exit 1; }
    exec "$FLUTTER" run --flavor stable "${DEFINES[@]}" "$@" ;;
  build-ios) [[ "$(uname)" == Darwin ]] || { echo "Building iOS requires macOS/Xcode (local or cloud)." >&2; exit 1; }
    exec "$FLUTTER" build ios --flavor stable --release --no-codesign "${DEFINES[@]}" "$@" ;;
  archive-ios)
    [[ "$(uname)" == Darwin ]] || { echo "Archiving iOS requires macOS/Xcode." >&2; exit 1; }
    : "${NEXUS_DEVELOPMENT_TEAM:?Own authorized Apple team is required}"
    : "${NEXUS_EXPORT_OPTIONS_PLIST:?Own valid export/signing options are required}"
    [[ -f "$NEXUS_EXPORT_OPTIONS_PLIST" ]] || { echo "Export options file is missing." >&2; exit 1; }
    [[ "$NEXUS_DEVELOPMENT_TEAM" =~ ^[A-Z0-9]{10}$ ]] || { echo "Invalid Apple team ID." >&2; exit 1; }
    BUNDLE_ID="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1]))["bundle_id"])' .nexus-prepared.json)"
    [[ "$BUNDLE_ID" != dev.nexus.client ]] || { echo "Prepare with your own registered bundle ID before signing." >&2; exit 1; }
    # Xcode's documented override file takes precedence over empty upstream
    # project settings. It contains a public team ID, never signing credentials.
    SIGNING_CONFIG="$SOURCE/ios/Flutter/NexusSigning.xcconfig"
    printf 'DEVELOPMENT_TEAM = %s\nCODE_SIGN_STYLE = Automatic\n' \
      "$NEXUS_DEVELOPMENT_TEAM" > "$SIGNING_CONFIG"
    export XCODE_XCCONFIG_FILE="$SIGNING_CONFIG"
    exec "$FLUTTER" build ipa --flavor stable --release "${DEFINES[@]}" \
      "--export-options-plist=$NEXUS_EXPORT_OPTIONS_PLIST" "$@" ;;
  *) echo "Unknown native command: $COMMAND" >&2; exit 2 ;;
esac
