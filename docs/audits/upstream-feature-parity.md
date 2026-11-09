# NEXUS upstream feature parity audit

## Reference and method

- Upstream: `https://github.com/fluxerapp/fluxer`
- Pinned reference: `b92ef502d44c063d77b8174232b33cb0272767d9` (main, checked 2026-11-09)
- Local source: `nexus-server-isolated`, commit `9c75a6a7`
- The earlier `settings-function-parity.md` audit used upstream commit `d6b742567af9290c384893e24a3c4ded0b1ea56b`; the pinned reference is 84 commits newer.
- The comparison maps upstream root names such as `fluxer_app` to their NEXUS equivalents. It compares tracked paths and Git blob hashes. A changed or absent file is only a lead for review, not proof of a missing feature.

## File-level comparison (not feature counts)

| Result | Count |
| --- | ---: |
| Upstream tracked files | 16,325 |
| Local tracked files | 14,575 |
| Same normalized path and contents | 4,295 |
| Same normalized path, different contents | 7,804 |
| Upstream paths absent locally | 4,226 |
| Local-only paths | 2,476 |

The large difference includes renamed branding, custom NEXUS behavior, assets, generated files, and infrastructure. Do not copy files solely because their paths differ.

## Confirmed settings findings

| Feature | Upstream | NEXUS | Action |
| --- | --- | --- | --- |
| Themes | Separate `themes` settings tab backed by `theme_settings/ThemesTab.tsx`. | Theme controls and Theme Studio already exist, but the settings menu had no separate `themes` tab. | Added a dedicated Themes tab and moved the existing control out of Appearance; this reuses NEXUS code without duplicating controls. Full upstream theme-settings parity is still under review. |
| Gifts and Premium | Gift inventory and Premium tabs are present but visibility is conditional on Premium availability. | Gift inventory and Plutonium components, API routes, and tab descriptors already exist. The self-hosted `premium_mode` defaults to `everyone`, which intentionally hides paid-premium UI; gift purchasing also needs active Stripe billing and gift price IDs. | This is configuration/availability, not a missing UI feature. Do not switch to paid `mirror` mode or reveal purchase actions without the owner's billing setup. |
| Profile edit shortcut | Desktop profile card includes a pencil and “Edit your profile” text. | Card had avatar/name without an edit hint; unclaimed accounts do not have an available profile tab. | Added the hint for claimed accounts and routed unclaimed accounts to the existing claim-account flow. |
| What's new, feedback, donate | Desktop settings includes these external-link entries. | They are absent from the current desktop settings sidebar. | Verify NEXUS-owned destinations before adding; never point to Fluxer destinations by default. |
| Operator Pass | Full client, API, admin, entitlement, and payment-related implementation exists upstream; its settings entry is conditional. | No Operator Pass implementation was found in the local application/API/admin source; local docs describe it as upcoming. | Treat as a full-stack subsystem, not a menu-only addition. Port only with its API/schema/admin dependencies and service configuration. |

## Confirmed existing NEXUS behavior

- The desktop client already pins the configured self-hosted NEXUS instance at the top of the instance picker. The current URL is a temporary Cloudflare Quick Tunnel, not a permanent endpoint.
- LAN discovery and the `nexus://invite/<code>` app link are already implemented. The invite link opens the configured instance automatically; adding another short-link system would duplicate this behavior. Remote use still depends on a stable, reachable server URL and the voice-media path.
- NEXUS already has report flows, billing/gift code services, and voice/video settings. Differences in upstream files must be checked for behavior and data integrity rather than copied as new parallel systems.

## Other differences requiring feature-level review

- The upstream snapshot contains 84 commits after the previous settings audit. Their subjects include OAuth/OIDC profile connections, community/post/person reports, voice and screen-sharing changes, account and guild deletion consistency, billing/refund mirroring, and per-rule media limits.
- NEXUS already contains related systems in several areas, including community reporting, screen-share audio handling, and self-hosted video-quality settings. These must be compared behavior-by-behavior before any port.
- Many upstream changes are bug fixes and data-integrity protections rather than new user-visible features. They must be checked for NEXUS equivalents and tested, not treated as missing solely because the file hash differs.
- Custom OAuth/OIDC profile connections are a real gap: upstream adds provider configuration, OIDC client handling, API routes, server configuration, and admin controls; NEXUS currently has other account connections but not this full provider system.
- Per-rule video-quality caps and the web-only pre-share setup modal also differ upstream. They require checking the existing NEXUS limit resolver and stream settings before porting; they are not yet marked complete.
- A user-profile reporting menu item was missing and has been added to the existing NEXUS report flow under the upstream AGPL notice.
- Upstream data-integrity changes are now applied to gift-code/index writes, OAuth token creation/revocation, and billing-refund webhook mirroring. The local charge lookup used by NEXUS dispute handling was preserved rather than removed.

## Licensing

The upstream repository declares AGPL-3.0. NEXUS branding and colors may remain, but imported code must retain the applicable notices and comply with source-availability terms. This audit does not change licensing or claim exclusive ownership of upstream code.

## Status

The settings and report UI now reuses existing NEXUS code, while the new profile-report menu item retains its upstream AGPL notice. Database consistency improvements were aligned with the pinned upstream behavior without removing NEXUS-specific lookup paths.

Biome passes for the modified app/API files. Four targeted API test files passed (14 tests), and the instance-directory test passed (5 tests). API typecheck reports 28 errors in four unrelated existing files; none point to the changed repositories. The full app TypeScript check exceeded the shell time limit. Two desktop tests run directly passed, while the other desktop tests require a generated BuildChannel file; the configured pnpm test command and direct generator are currently unavailable in this environment. This remains partial parity work, not a claim of completion; no Windows build has been run.
