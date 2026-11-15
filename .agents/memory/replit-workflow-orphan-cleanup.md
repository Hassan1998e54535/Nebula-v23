---
name: Replit workflow orphan cleanup
description: Clean up NEXUS services left behind after an interrupted native development workflow.
---

After an interrupted native workflow, detached NEXUS service processes can survive the workflow supervisor and keep ports occupied. A later restart may fail on address-in-use and then cascade into API readiness errors.

**Why:** The supervisor may stop before its cleanup trap runs, leaving service children alive even though Replit reports the workflow as stopped.

**How to apply:** Before retrying a failed native start, inspect current process commands and logs, stop only verified stale NEXUS processes, and preserve healthy SeaweedFS data and its storage process.
