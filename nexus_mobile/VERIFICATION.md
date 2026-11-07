# Native NEXUS verification

## Current status

**Not ready for iPhone installation. No IPA or signed iOS build has been produced.**
This is a source integration, not a completed TestFlight release.

On 2026-11-07 the user explicitly deferred completion of the phone client in
favor of the Windows installer and owner-operated server. Closing the source
preparation phase does not change any incomplete evidence below into a pass.

The materialized client is the actual pinned Flutter client, with its Dart SDK
and native Rust Markdown parser. NEXUS changes are reproducible from the checked-in
integration; the existing web/desktop sources and database were not replaced.

## Passed locally

- Eight Python preparation checks: HTTPS origin restrictions, independent bundle
  IDs, exact source pins, archive traversal rejection, retained licenses/native
  identifiers, actual font glyphs/outlined artwork, preservation of original
  feature files, and unchanged standalone Rust dependency pins/plugin paths.
- Flutter dependencies, localization generation and native asset hooks completed
  using Flutter 3.47.9 / Dart 3.13.7. The standalone Rust parser's lock was derived
  using Cargo from upstream without upgrading package versions.
- Flutter code generation completed, including Riverpod, Drift and mocks.
- Five Flutter tests passed: NEXUS discovery URL normalization, cold endpoint
  defaults, real SDK parsing and persisted snapshot restoration, exact default
  dark colors, and rendering the verified NEXUS logo widget.
- The test suite deliberately skipped its opt-in live-account test. A skipped
  test is **not** a successful backend integration test.
- Materialized iOS display names, launch/icon assets and Android adaptive icon
  vectors use NEXUS. Original Swift symbol/file references remain unchanged.

## Incomplete / not proven

| Area | Actual evidence and remaining work |
| --- | --- |
| Full analyzer | Attempted, but interrupted by the constrained workspace/resource failures. It is not reported as a clean analysis pass. Fixes were made for the emitted live-test lint findings. The manual macOS workflow includes the check. |
| Registration/login against NEXUS | Opt-in real SDK test exists, but was not completed in this run. No claim of successful native signup/login is made. |
| Profile, status and messages against NEXUS | Covered by the pending real SDK smoke test, not by the five offline contract tests. Actual mobile UI interaction remains unverified. |
| Gateway compression/heartbeat | The live test checks READY, negotiated compression, frames and heartbeat ACK; that test has not passed yet. |
| iOS compilation/signing | Requires macOS/Xcode. Neither the manual macOS workflow nor a local iOS build has been executed here. No signing certificate or provisioning profile was reused. |
| Installation/TestFlight | No upload, invitation, purchase or publication has happened. Requires the project's authorized Apple distribution setup and explicit authorization. |
| Arabic/RTL | Original localization and layout implementations retained; Arabic native font glyph coverage verified. Device rendering and navigation have not been verified. |
| Custom profile artwork/effects | Existing NEXUS data is not rewritten. Native rendering of NEXUS-specific profile effects/glass layers has not been verified. Do not infer a pixel-for-pixel match with web CSS. |
| Voice/video/device routing | Original native implementations retained; no microphone, two-device call, background call or Bluetooth test performed. |
| APNs/VoIP ringing | Client and backend transport implementations exist. Own Apple capabilities/provider credentials and delivery to a real device remain unverified. |
| Sharing/deep links/passkeys | Identity/scheme/entitlement wiring prepared, but no device share-extension, AASA/universal-link or passkey test performed. |
| Android | Original Android source retained and identity adjusted; no APK/AAB build or physical Android test performed. iOS APNs build settings are not an Android push configuration. |
| Availability | Development origin only. An independently verified published backend is needed for a distributable app; preparing this client does not keep the workspace online. |

The web workflow was temporarily paused to avoid concurrent heavy compilers and
then restarted. One startup failed while resources were constrained; a later
startup showed API/worker activity. Browser screenshot attempts disconnected, so
there is **no successful final visual verification** of the web preview or the
signed-in UI in this run.

At the time of the native checks, the web launcher warned that original uploaded
profile-media ZIPs were missing. Subsequent repository preparation recovered the
original archives and prepared their assets; this does not verify their native
rendering or make their older history available in the new GitHub repository.
No replacement artwork was invented and no customer data was deleted.

## Reproduce / continue

See [README](README.md) for preparation, offline dependency reuse, test and macOS
build commands. Run generation, analyzer and test compilation sequentially.
Keep the normal web/backend stack stopped during memory-intensive compilation
when necessary, then restore it for actual API/device verification.

Before describing this as installable: complete the live backend test, pass a
macOS iOS build, configure authorized Apple signing, export a valid distribution
build and verify installation on a real iPhone. Do not relabel an unsigned `.app`
or source archive as an installable IPA.
