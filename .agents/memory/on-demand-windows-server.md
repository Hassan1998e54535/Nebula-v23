---
name: On-demand Windows server
description: The owner's desired run model for the self-hosted NEXUS server.
---

The owner wants to run the NEXUS server on his Windows PC only when he starts a testing session with a friend. It does not need to stay online 24/7; the friend should expect the service to be unavailable while the owner's PC/server is off.

The friend uses the desktop app on the same Wi-Fi and should see a named NEXUS server card automatically, rather than being asked to enter a raw URL. The card should be available only while the host server is running.

Normal server starts should reuse already available Docker images; only missing images on the first run or an explicit source update should trigger a rebuild.

**Why:** The owner clarified that always-on hosting is not required and asked for the same click-to-open server experience as familiar chat apps.

**How to apply:** Prefer an easy start/stop local server flow and same-LAN discovery over an always-on VPS as the default. Avoid forcing Docker rebuilds on routine starts; explain that a friend on another network still needs a reachable address or tunnel while the PC is running.
