# NEXUS server on Windows

This runs a new, isolated local test server from the NEXUS source tree. It is separate from the Windows desktop client and from any existing Docker Compose project named `nexus`.

## Start locally

1. Download and extract the private NEXUS source ZIP on the server computer.
2. Install Docker Desktop with its WSL 2 Linux-container engine, then start Docker Desktop.
3. Open `deploy/self-hosting/windows` and double-click `Start-NEXUS-Server.cmd`.
4. On the first run, the launcher creates a private `.env` at `%LOCALAPPDATA%\NEXUS\Server\.env` with new secrets and builds the server images from this source tree. The first build can take a long time.
5. Open `http://localhost:8081` on that same computer.

The new stack uses the separate Docker Compose project `nexus-host-local`, a separate local `.env`, and separate Docker volumes. Existing containers and volumes are left untouched. The database and uploads live in Docker's persistent volumes. `Stop-NEXUS-Server.cmd` stops only this new stack without deleting its volumes. Do not run `docker compose down -v` unless you intend to erase this server's data.

## Friend access and email

`localhost` is reachable only from the server computer. To let a friend connect over the internet, the server needs a stable public domain or hostname, HTTPS, router/firewall access, and the voice ports required by LiveKit. Keep the server computer and Docker Desktop running while the friend uses the app. Do not use a Replit preview URL as the permanent server address.

Email delivery is disabled in the local test configuration. Real account-confirmation email requires SMTP settings in the server's local `.env`; never share that file or commit it to GitHub. Until SMTP and public HTTPS are configured, the friend cannot complete a real email-confirmed signup from outside the house.
