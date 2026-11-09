# NEXUS server on Windows

This runs a new, isolated local test server from the NEXUS source tree. It is separate from the Windows desktop client and from any existing Docker Compose project named `nexus`.

## Start the server

1. Download and extract the private NEXUS source ZIP on the server computer.
2. Install Docker Desktop with its WSL 2 Linux-container engine, then start Docker Desktop.
3. Open `deploy/self-hosting/windows` and double-click `Start-NEXUS-Server.cmd`.
4. The launcher asks whether to share NEXUS with devices on the current private Wi-Fi network, then separately whether to allow remote voice. Run it as Administrator and answer `y` only for sharing options you need. LAN sharing uses unencrypted HTTP and is limited to the current private subnet. Remote voice opens only the LiveKit media ports in Windows Firewall; you must also configure your router as described below.
5. On the first run, the launcher creates a private `.env` at `%LOCALAPPDATA%\NEXUS\Server\.env` with new secrets. Docker Compose builds images that are missing; that first build can take a long time. Later starts reuse the existing images instead of forcing a rebuild. After updating server source, run `Start-NEXUS-Server.cmd -RebuildImages` to rebuild them.
6. Open the server address printed by the launcher on the server computer. When LAN sharing is enabled, current NEXUS desktop clients on the same subnet discover a `NEXUS server` card automatically; no one needs to type its address. When sharing is declined, the server remains local to this computer.

The new stack uses the separate Docker Compose project `nexus-host-local`, a separate local `.env`, and separate Docker volumes. Existing containers and volumes are left untouched. The database and uploads live in Docker's persistent volumes. `Stop-NEXUS-Server.cmd` stops only this new stack without deleting its volumes. Do not run `docker compose down -v` unless you intend to erase this server's data.

## Network limits

LAN discovery works only while the server is running and the friend is on the same local subnet. The firewall rules are removed when the server stops. Do not enable LAN sharing on public or guest Wi-Fi.

Remote web/API access and voice media are separate paths. The current HTTPS tunnel can carry web/API traffic, but it does not carry LiveKit's UDP/TCP media ports. To test remote voice:

1. On a trusted home network, start the server as Administrator and answer `y` to the remote-voice question. The launcher opens inbound TCP `17881` and UDP `17882` on the Windows Private firewall profile only. It does not open the web/API port to the internet.
2. In the home router, forward external TCP `17881` to this PC's LAN IPv4 address on TCP `17881`, and external UDP `17882` to the same PC on UDP `17882`. Reserve the PC's LAN address in the router first so it does not change.
3. The router must have a public IPv4 address. Port forwarding will not work behind carrier-grade NAT or an additional router unless that upstream network is configured too. Do not use router DMZ mode.
4. Keep the PC, Docker Desktop, and server running during the test. The Windows firewall rules are removed when the server is stopped; the router forwarding entries should be removed when remote testing is no longer needed.
5. The remote friend's network may block UDP. LiveKit also has its TCP media port, but opening these ports cannot guarantee connectivity through every restrictive network.

This is a temporary, on-demand test setup, not a permanent public service. The trycloudflare address is temporary and may change; it is not a domain you own. Do not enable remote voice on public or guest Wi-Fi, and do not use a Replit preview URL as the permanent server address.

Email delivery is disabled in the local test configuration. The owner should choose username sign-in for this trial; never share the server's `.env` file or commit it to GitHub.
