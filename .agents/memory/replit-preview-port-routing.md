---
name: Replit preview port routing
description: Avoid recursive asset proxying when exposing the NEXUS development stack through a Replit webview.
---

The external Replit webview port must route to the full NEXUS development proxy, which sends application assets to the frontend dev server and API/gateway requests to their services. Routing that public port directly to the standalone app proxy can create a recursive static-asset request when the app proxy's CDN endpoint points back to the same public origin; the root HTML loads but JavaScript and CSS return 503.

**Why:** Replit's app proxy fetches `/assets/*` from its configured static CDN endpoint. During preview, that endpoint may resolve back through the same external port, so the route must land on the full dev proxy rather than the app proxy itself.

**How to apply:** Keep the webview's public port aligned with the workflow's full proxy listener, and verify the root, bootstrap JS/CSS, and main bundle through the external Replit URL before judging the preview ready.
