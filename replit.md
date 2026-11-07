# Replit setup

Use **Run**, or the existing `Start application` workflow:

```sh
bash tools/replit/run-native.sh
```

This starts the full NEXUS development stack: the Rust supervisor, API, gateway,
workers, frontend, and local Valkey/NATS/Meilisearch services. Cold starts can
compile native components and take several minutes. Replit does not support Docker;
the original devcontainer files are retained for other environments.

The preview proxy listens on port 5000 and forwards to the internal NEXUS proxy on
8088. Keep port 5000 as the only externally mapped port; internal service ports
must remain local-only. API and media requests use the preview origin. The Rspack
HMR WebSocket currently returns 502 through the preview proxy, so refresh the page
to pick up source edits until that path is fixed.

The full development backend uses Replit's development PostgreSQL connection
(`DATABASE_URL` mapped to `NEXUS_POSTGRES_URL`). It is intentionally separate from
the original Docker-based PostgreSQL configuration and from the earlier Mock data
in `nexus_app/.dev_storage.json`. Do not import, delete, or replace either data
store unless explicitly requested. The Mock backend simulates authentication and
permissions; it is not secure for public use. Wait for the login page and bootstrap
assets to pass the preview readiness check before treating the app as ready.

Voice requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in Replit
Secrets; never hardcode their values. Voice tokens can use the real configured
LiveKit service, but a two-device call must be tested separately.
Profile artwork is served from the generated media cache under `/assets/profile-media`.

## Mock development mode (not the default workflow)

Mock users, guilds, and channel messages remain stored separately in
`nexus_app/.dev_storage.json` (excluded from Git and deployments). Authentication
and developer permissions are simulated. The original database/object-store data
remains unchanged; do not treat Mock records as records in the full backend.

Native-backend email requires the complete `NEXUS_EMAIL_*` SMTP settings (enabled, provider,
sender email/name, host, port, username, password, and TLS mode). Incomplete
configuration disables the corresponding service explicitly; email never falls back
to Mailpit in the preview. Do not put credentials in source files or print them.

This is a development setup, not a production deployment. Existing development
defaults (including relaxed rate limits) must not be treated as production settings.
