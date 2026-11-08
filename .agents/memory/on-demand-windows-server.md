---
name: On-demand Windows server
description: The owner's desired run model for the self-hosted NEXUS server.
---

The owner wants to run the NEXUS server on his Windows PC only when he starts a testing session with a friend. It does not need to stay online 24/7; the friend should expect the service to be unavailable while the owner's PC/server is off.

The friend uses the desktop app on the same Wi-Fi and should see a named NEXUS server card automatically, rather than being asked to enter a raw URL. The card should be available only while the host server is running.

For remote friends, the owner wants a NEXUS-branded invite or instance shortcut instead of exposing a raw IP. One remote friend's voice connection has remained at “Connecting…” while others are not affected; same-LAN discovery does not solve remote access or this voice issue.

Normal server starts should reuse already available Docker images; only missing images on the first run or an explicit source update should trigger a rebuild.

**Why:** The owner clarified that always-on hosting is not required, wants a branded click-to-open experience, and reported a connection issue affecting one user rather than everyone.

**How to apply:** Keep LAN discovery and remote access as separate paths. Keep self-hosted instances distinct from official instances; remote aliases still need a reachable endpoint and voice-media path. Diagnose individual voice failures from client/server network logs. Avoid forcing Docker rebuilds on routine starts.
