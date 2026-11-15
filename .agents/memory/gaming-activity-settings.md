---
name: Gaming activity settings
description: Product direction for the NEXUS game-detection settings and profile activity.
---

The gaming settings page should focus on global game detection and activity-sharing controls, not a grid or catalog of game cards. Detected activity belongs on user profiles as a distinct activity presentation. Activity sharing also needs per-server visibility overrides: hiding activity in one server must not hide it in other servers. Settings surfaces should use the active app theme tokens, while profile activity cards should reflect the viewed profile's accent rather than a fixed color.

**Why:** The owner rejected a settings page dominated by game cards and asked for a simple general discovery control with a clear on/off switch. They also asked that profile stream cards and settings controls follow the selected theme and profile accent.

**How to apply:** Keep detection settings concise and separate from the profile's activity display; include a global sharing switch with independent per-server controls, and do not reintroduce the game catalog to this page without the owner's request. Use semantic app-theme colors for settings and profile accent tokens for profile activity cards; avoid fixed navy/purple surfaces that ignore user themes.
