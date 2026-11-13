---
name: Windows app-control and passkeys
description: Windows code-integrity policies can block the WebAuthn native addon even when the installer and app are otherwise valid.
---

Treat the WebAuthn native module as a degraded optional capability on Windows. If Windows application-control policy blocks the addon, NEXUS should still start and report passkeys as unavailable; keep the module fatal on platforms where the app's startup policy expects it.

**Why:** The Windows installer can install and launch successfully in a clean CI environment but fail on a user's machine when local WDAC, AppLocker, or Smart App Control rules prevent loading the native `.node` binary. Recommending that users disable their Windows security policy is not an acceptable workaround.

**How to apply:** When this exact native-module load is blocked, allow the app to open without passkey support and surface the capability as unavailable. Do not weaken or advise disabling the user's system-wide application-control policy.
