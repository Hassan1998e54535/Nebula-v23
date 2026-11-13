---
name: On-demand Windows server
description: The owner's desired run model for the self-hosted NEXUS server.
---

The owner wants to run the NEXUS server on his Windows PC only when he starts a testing session with a friend. It does not need to stay online 24/7; the friend should expect the service to be unavailable while the owner's PC/server is off.

The friend uses the desktop app on the same Wi-Fi and should see a named NEXUS server card automatically, rather than being asked to enter a raw URL. The card should be available only while the host server is running.

For remote friends, the owner wants a NEXUS-branded invite or instance shortcut instead of exposing a raw IP. One remote friend's voice connection has remained at “Connecting…” while others are not affected; same-LAN discovery does not solve remote access or this voice issue.

For the current remote-voice test, the owner chose direct router port forwarding instead of TURN. Enable it only for a test session, expose LiveKit TCP 17881 and UDP 17882 (not the web/API port) and scope the Windows firewall rules to the Private profile.

For fixed public web access, the owner chose the DuckDNS hostname through the home router, with HTTPS terminated by Caddy. Web access uses TCP 80/443 and is a separate opt-in from remote voice; the agent must not change router settings.

Normal server starts should reuse already available Docker images; only missing images on the first run or an explicit source update should trigger a rebuild.

**Why:** The owner clarified that always-on hosting is not required, wants a branded click-to-open experience, reported a connection issue affecting one user rather than everyone, chose direct router forwarding for remote voice, and selected the fixed DuckDNS hostname for HTTPS web access.

**How to apply:** Keep LAN discovery, HTTPS web access, and remote voice as separate paths. Keep self-hosted instances distinct from official instances; a DNS name alone does not make a local service reachable. Keep public web and voice firewall rules opt-in, never alter the router, and remind the owner to remove port forwards after testing. Diagnose individual voice failures from client/server network logs. Avoid forcing Docker rebuilds on routine starts.
