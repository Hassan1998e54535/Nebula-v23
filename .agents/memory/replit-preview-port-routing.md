---
name: Replit preview port routing
description: Avoid recursive asset proxying when exposing the NEXUS development stack through a Replit webview.
---

The external Replit webview port must route to the full NEXUS development proxy, which sends application assets to the frontend dev server and API/gateway requests to their services. Routing that public port directly to the standalone app proxy can create a recursive static-asset request when the app proxy's CDN endpoint points back to the same public origin; the root HTML loads but JavaScript and CSS return 503. Instance discovery also fails if the app-proxy fallback returns HTML or advertises an API on a different port.

**Why:** Replit's app proxy fetches `/assets/*` from its configured static CDN endpoint. During preview, that endpoint may resolve back through the same external port, so the route must land on the full dev proxy rather than the app proxy itself. Replit does not apply `.replit` port mapping changes on a workflow restart alone; the compute environment must restart before the external route changes. Replit configuration syncs have also restored an older port map in later commits, so a successful validated edit alone does not prove the active file still has it.

**How to apply:** Map the webview's public port to the full proxy listener, keep all advertised service endpoints on that same origin, then re-read `.replit` and compare `git status`/the latest commit before restarting compute. After restart, verify discovery returns JSON with same-origin API endpoints, and confirm the root, bootstrap JS/CSS, and main bundle through the external Replit URL.
