# NEXUS mobile branding overlays

The overlay keeps the upstream Flutter layout, gestures, theme system, profile
presets, and runtime user color overrides. It changes only the default dark
theme tokens and the existing compact brand mark.

## Assets for the main preparation script

- The compact logo widget embeds the verified geometry from
  `nexus_app/src/media/images/nexus-brand-icon.svg`, retaining its original
  indigo circle (`#4F46E5`) while supporting optional instance background and
  mark colors. No duplicate Flutter image asset is needed for this widget.
- The app's licensed NEXUS Sans and NEXUS Mono font sources are already in
  `packages/fonts/files/` (Modified Versions of IBM Plex; see
  `packages/fonts/NOTICE.md` and `packages/fonts/LICENSE-IBM-PLEX.txt`). Bundle
  Flutter-compatible font assets for `NEXUS Sans` and `NEXUS Mono`, and include
  the OFL license/notice with the distributed app. Include the
  `NEXUSSansArabic` family for Arabic-first text shaping/fallback. The local
  NEXUS font files are WOFF2, while the pinned Flutter app currently declares
  TTF files, so the preparation step must convert or otherwise provide
  Flutter-supported font files and update the app-owned font registration in
  `pubspec.yaml`; that file is intentionally not changed in this overlay.

The logo has an intentional indigo circle. Do not substitute the monochrome
symbol or the stale `nexus-wordmark.svg`; no NEXUS wordmark is used here.
Native iOS app icons, launch screens, and other bundle artwork are outside
this overlay and still need review/replacement in the main preparation work.
