---
name: On-demand Windows server
description: The owner's desired run model for the self-hosted NEXUS server.
---

The owner wants to run the NEXUS server on his Windows PC only when he starts a testing session with a friend. It does not need to stay online 24/7; the friend should expect the service to be unavailable while the owner's PC/server is off.

**Why:** The owner clarified that always-on hosting is not required for the intended trial.

**How to apply:** Prefer an easy start/stop local server flow over an always-on VPS as the default. Explain that a friend on another network still needs a reachable address or tunnel while the PC is running.
