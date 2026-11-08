# NEXUS server on Windows

This runs a new, isolated local test server from the NEXUS source tree. It is separate from the Windows desktop client and from any existing Docker Compose project named `nexus`.

## Start the server

1. Download and extract the private NEXUS source ZIP on the server computer.
2. Install Docker Desktop with its WSL 2 Linux-container engine, then start Docker Desktop.
3. Open `deploy/self-hosting/windows` and double-click `Start-NEXUS-Server.cmd`.
4. The launcher asks whether to share NEXUS with devices on the current private Wi-Fi network. Answer `y` only on a trusted home network; this LAN test uses unencrypted HTTP. The launcher adds firewall rules limited to the Private profile and local subnet.
5. On the first run, the launcher creates a private `.env` at `%LOCALAPPDATA%\NEXUS\Server\.env` with new secrets and builds the server images from this source tree. The first build can take a long time.
6. Open the server address printed by the launcher on the server computer. When LAN sharing is enabled, current NEXUS desktop clients on the same subnet discover a `NEXUS server` card automatically; no one needs to type its address. When sharing is declined, the server remains local to this computer.

The new stack uses the separate Docker Compose project `nexus-host-local`, a separate local `.env`, and separate Docker volumes. Existing containers and volumes are left untouched. The database and uploads live in Docker's persistent volumes. `Stop-NEXUS-Server.cmd` stops only this new stack without deleting its volumes. Do not run `docker compose down -v` unless you intend to erase this server's data.

## Network limits

LAN discovery works only while the server is running and the friend is on the same local subnet. The firewall rules are removed when the server stops. Do not enable LAN sharing on public or guest Wi-Fi. This setup does not provide internet access; remote friends need a separate secure public endpoint and network configuration. Keep the server computer and Docker Desktop running while anyone uses the app. Do not use a Replit preview URL as the permanent server address.

Email delivery is disabled in the local test configuration. The owner should choose username sign-in for this trial; never share the server's `.env` file or commit it to GitHub.
