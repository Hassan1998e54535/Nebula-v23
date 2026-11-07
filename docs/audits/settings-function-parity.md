# NEXUS settings and own-profile wiring audit

## Scope and source

Reference: the public `fluxerapp/fluxer` repository, main revision
`d6b742567af9290c384893e24a3c4ded0b1ea56b`, retrieved 2026-11-07.
This is a source-level audit, not a claim of complete product or runtime parity.
The reference is newer than some of NEXUS's inherited code. A difference alone
does not prove that the profile redesign removed a feature.

No upstream repository was copied over NEXUS. No authentication, permissions,
payment service, database, or branding was replaced.

## Compared registries

Compared section IDs in Accessibility, AccountSecurity, Appearance, ChatSettings,
GeneralSettings, Notifications, PrivacySafety, and VoiceVideo sections.

- Upstream has 56 section IDs across these eight registries; NEXUS has 51.
- NEXUS includes all upstream IDs in seven of those registries.
- NEXUS additionally indexes `media`, `chat-wallpaper`, and `favorites`.
- GeneralSettings does not index these eight upstream IDs:
  `profile-badges`, `subscription`, `operator-pass-passes`,
  `operator-pass-wall`, `operator-pass-labs`, `payment-methods`,
  `refunds`, and `receipts`.
- An absent search/section ID is not proof of an absent backend feature.
  These entries have NOT been blindly enabled: payments and Operator Pass
  require their actual services and entitlement logic, and the profile-badge
  editing path needs a separate component-level comparison.
- All 12 upstream guild settings tab IDs have local counterparts. NEXUS adds
  `channels`. Permissions and required guild features still filter tab access;
  the channels entry is intentionally mobile-only in this modal.
- Registry coverage does not verify every save operation, modal, role-specific
  route, or API implementation.

## Navigation and profile findings

| Area | Finding |
| --- | --- |
| Devices, authorized applications, blocked users | Hidden from primary navigation by SettingsNavigationGroups; legacy tab IDs map to AccountSecurityTab. Inner controls still require runtime validation. |
| Appearance / Theme colors | Calls the existing Theme Studio. On mobile the command navigates to the same app's `/theme-studio?from=appearance`; it is not an external website. |
| Own mobile profile | The bottom navigation opens UserProfileMobileSheet, rather than inheriting the old YouPage's entire action layout. |
| Avatar / phone status affordance | Previously only had a handler when the owner was ONLINE and Presence marked them mobile; the handler opened the account-actions menu, not the status sheet. Changed to open the existing status sheet for any own-profile presence state. |
| Own mobile profile status row | Renders and opens the existing StatusChangeBottomSheet. |
| Custom status and expiry | Existing status sheet contains CustomStatusBottomSheet, all four presence states, and StatusExpiry handling. Initial snap is half height; larger snaps remain available. |
| Name arrow and account switching | Existing arrow opens account actions; switching and adding accounts use the existing account-switcher command. |
| Copy username / user ID | Existing mobile three-dot actions sheet; not standalone buttons in the profile body. |
| Build info / voice diagnostics | Existing UserAreaPopout entries gated by developer mode, not entries in UserProfileActionsSheet. |
| Desktop own-account popout | Still has status, custom status, account switching, copy identity actions, developer diagnostics and editing handlers. |

## Verification limits

The regression tests added here guard the source wiring and retained entry
points; they do not simulate a tap, change presence on the gateway, or prove
Safari stacking/animation behavior. Browser runtime checks and a complete
feature-by-feature comparison remain necessary before claiming no omissions.

The “starting NEXUS” page comes from the development preview proxy while its
initial readiness probes fail. It is separate from the profile/settings action
wiring; a live preview is not a persistent published service.
