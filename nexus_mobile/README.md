# NEXUS native mobile client

This is the NEXUS integration of the **actual Flutter client** from
[`fluxerapp/flutter_client`](https://github.com/fluxerapp/flutter_client), not
an Expo replacement, PWA, or WebView shell. It does not move or replace
`nexus_app`, `nexus_desktop`, the API, or their data.

**Status:** source/build integration. An unsigned source tree or `.app` is **not**
an installable iPhone application. A working web preview does not prove iOS works.
See [verification](VERIFICATION.md) for the checks actually performed.

**Priority update (2026-11-07):** the user explicitly deferred the remaining
native-phone work to prioritize the Windows installer and owner-operated server.
This preserves the source preparation; it does not complete native backend,
device, signing, or installation verification.

## Why the upstream source is prepared rather than committed again

The pinned client contains about 100 MB of source/generated translations and
artwork, before Flutter, SDK caches and build products. Keep those reproducible
inputs out of this already-large repository. The small, reviewable NEXUS
integration is committed here; source archives are checksum-verified and restored
under `generated-artifacts/nexus-mobile/`, which is excluded from Git/deployment.
No nested Git repository or submodule is needed.

- `upstream.lock.json`: exact client, SDK and Rust parser references/checksums.
- `tool/prepare.py`: safe, repeatable materialization; refuses checksum drift.
- `tool/adapt.py`: protocol paths and native identity changes, with upstream
  integration-point guards.
- `overlays/`: complete modified/new Dart files and regression tests.
- `tool/fonts.py`: converts the existing licensed NEXUS fonts to native TTF.
- `tool/mobile.sh`: native dependency, analysis, test and iOS build commands.

Edit overlays/adapters, **not** the generated checkout. Re-preparing replaces that
generated checkout. This never replaces the application's database or web source.

## Prepare and test

Required tools: Python 3.11+, ImageMagick, Rust/Cargo and **Flutter 3.47.9**
(Dart >=3.12). The Replit stable Nix Flutter package currently supplies Dart 3.8
and cannot run this client; do not lower the client's dependency constraints.
The tool prefers `generated-artifacts/toolchains/flutter/bin/flutter` when present,
or accepts an explicit `FLUTTER_BIN`.

In Replit, install font-conversion requirements through its package management.
On a macOS build runner, install `requirements.txt` with Python's package manager.
No font substitution or proprietary font download is required.

```sh
# YOUR_HOST must be the actual verified NEXUS HTTPS server, not a made-up URL.
bash nexus_mobile/tool/mobile.sh prepare \
  --origin https://YOUR_HOST \
  --bundle-id dev.nexus.client
bash nexus_mobile/tool/mobile.sh deps
bash nexus_mobile/tool/mobile.sh check
bash nexus_mobile/tool/mobile.sh test
python3 -m unittest discover -s nexus_mobile/tests -v

# Explicit opt-in: creates a development-only test account and a personal note.
# Does not modify customer accounts or print credentials.
bash nexus_mobile/tool/mobile.sh live
```

The development bundle ID above is only an unsigned local identifier. It is not
represented as an Apple-registered identity owned by NEXUS.

For an exact toolchain outside the provided package versions, the checked input
is Flutter's official `c197ca5199e9ee5661e865596c9c07294dfab51c` revision. The
current workspace has that SDK in the ignored toolchain directory. On a fresh
machine install that SDK (or a compatible validated version) explicitly; the
normal web workflow does not download Flutter or start the native client.

## What changes, and what stays original

- Default discovery is **our** `/api/.well-known/nexus`; the SDK refresh and
  initial-discovery paths agree. No official-host bypass can silently redirect
  credentials to Fluxer.
- The origin is a mandatory public build parameter. An unconfigured build
  displays a configuration error instead of hanging or calling a third party.
- Actual API/gateway/media/CDN/feature flags come from NEXUS discovery. The SDK
  keeps its existing `fluxer_dart` API and Dart class names for compatibility.
  A name in an internal class/import is not a user-facing brand or network
  destination.
- NEXUS's default palette, verified N mark, native icons, outlined wordmark,
  NEXUS Sans/Mono and Arabic fallback are applied. Light mode, user theme
  overrides, profile data and original navigation/gestures remain available.
- The original native auth, account switcher, status/profile controls,
  channels/messages, guild permission checks, voice, file/share and settings
  implementations are retained. Their presence is not a claim that every
  platform-specific service has been device-tested.
- iOS bundle identifiers, app groups, URL scheme (`nexus://`), keychain groups,
  native channel names and plugin directories are changed consistently.
  Fluxer's development team and provisioning profile references are not used.
- Third-party telemetry defaults off. Firebase project credentials, upstream
  release workflows and upstream store listings are not distributed.
- Store billing uses the upstream OSS stub until NEXUS has an explicitly
  configured billing product. Nothing is charged or purchased.
- Help/status/download/store/community URLs are optional operator-owned
  parameters, not invented links. An unconfigured external destination produces
  an explicit message. Legal links primarily come from server discovery.

Optional public destinations can be passed as `NEXUS_HELP_URL`,
`NEXUS_FEEDBACK_URL`, `NEXUS_COMMUNITY_INVITE`, `NEXUS_TERMS_URL`,
`NEXUS_PRIVACY_URL`, `NEXUS_STATUS_URL`, `NEXUS_RELEASE_NOTES_URL`,
`NEXUS_DOWNLOAD_URL`, and `NEXUS_APP_STORE_URL` to the build wrapper.
They must be the operator's actual destinations. Never put passwords, tokens,
signing keys or certificates in these definitions or in the repository.

## iPhone build and installation

You do **not** need to own a Mac to install a distributed NEXUS build. However,
Xcode on **some** macOS machine/cloud runner must first compile the native app,
and Apple must authorize its signing/distribution.

`.github/workflows/nexus-mobile-ios.yml` is a **manual-only**, read-only-source
macOS build configuration. It is not invoked by the normal app workflow and
does not upload anything to TestFlight/App Store. Running it can consume the
GitHub account's build allowance; review it and authorize it separately.

On a macOS build machine:

```sh
bash nexus_mobile/tool/mobile.sh prepare \
  --origin https://YOUR_VERIFIED_NEXUS_SERVER \
  --bundle-id YOUR_REGISTERED_BUNDLE_ID
bash nexus_mobile/tool/mobile.sh deps
bash nexus_mobile/tool/mobile.sh test
bash nexus_mobile/tool/mobile.sh build-ios
```

`build-ios` outputs an **unsigned `.app`**, useful for build verification only.
Renaming/zipping it as an IPA does not make it installable.

For a signed archive, configure the project's **own** Apple team, registered app
and extension IDs, app group, correct entitlements, certificates and provisioning
profiles in a secure macOS build environment. Supply the public
`NEXUS_DEVELOPMENT_TEAM` and a local `NEXUS_EXPORT_OPTIONS_PLIST` file path, then:

```sh
bash nexus_mobile/tool/mobile.sh archive-ios
```

This prepares a local signed archive/export only if the signing setup is valid.
It never performs a TestFlight upload. App Store Connect/TestFlight setup and
upload require separately authorized access; never send Apple passwords or keys
in chat. Apple's free seven-day personal signing is not a phone-only download
link, and is not what this build setup claims to provide.

APNs notification delivery, VoIP PushKit ringing, universal links/passkeys and
App Attest need valid NEXUS Apple capabilities and server configuration, not just
new names. Associated domains in entitlements request capabilities; they do not
create the corresponding AASA document or prove it is installed.

## Backend availability

Use a **verified published** server for distribution. A `.replit.dev` preview
origin is for development and can stop when the workspace stops. Building an app
does not publish or keep that development server running. Do not share a
development-origin build as a permanent release.

## Licensing

NEXUS owns its supplied identity and additions, not the entire upstream codebase.
The upstream client/SDK/parser licenses and store-distribution exception remain
in the materialized source. Distributors must comply with their AGPL source-offer
obligations and retain third-party notices. The existing IBM Plex-derived NEXUS
font OFL notice/license is bundled with the app. Do not remove these notices as
part of “cleaning” the brand.
