---
name: On-demand Windows server
description: The owner's desired run model for the self-hosted NEXUS server.
---

The owner wants to run the NEXUS server on his Windows PC only when he starts a testing session with a friend. It does not need to stay online 24/7; the friend should expect the service to be unavailable while the owner's PC/server is off.

The friend uses the desktop app on the same Wi-Fi and should see a named NEXUS server card automatically, rather than being asked to enter a raw URL. The card should be available only while the host server is running.

For remote friends, the owner wants a NEXUS-branded invite or instance shortcut instead of exposing a raw IP. One remote friend's voice connection has remained at “Connecting…” while others are not affected; same-LAN discovery does not solve remote access or this voice issue.

For the current remote-voice test, the owner chose direct router port forwarding instead of TURN. Enable it only for a test session, expose LiveKit TCP 17881 and UDP 17882 (not the web/API port) and scope the Windows firewall rules to the Private profile.

Normal server starts should reuse already available Docker images; only missing images on the first run or an explicit source update should trigger a rebuild.

**Why:** The owner clarified that always-on hosting is not required, wants a branded click-to-open experience, reported a connection issue affecting one user rather than everyone, and chose port forwarding for the on-demand voice test.

**How to apply:** Keep LAN discovery and remote access as separate paths. Keep self-hosted instances distinct from official instances; remote aliases still need a reachable endpoint and voice-media path. Keep remote voice ports opt-in and tell the owner to remove router forwards when no longer testing. Diagnose individual voice failures from client/server network logs. Avoid forcing Docker rebuilds on routine starts.
