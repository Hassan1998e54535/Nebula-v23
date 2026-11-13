# NEXUS server on Windows

This runs a new, isolated local test server from the NEXUS source tree. It is separate from the Windows desktop client and from any existing Docker Compose project named `nexus`.

## Start the server

1. Download and extract the private NEXUS source ZIP on the server computer.
2. Install Docker Desktop with its WSL 2 Linux-container engine, then start Docker Desktop.
3. Open `deploy/self-hosting/windows` and double-click `Start-NEXUS-Server.cmd`.
4. The launcher asks separately about private-LAN access, remote voice, and public HTTPS access. Run it as Administrator and enable only the paths needed for a trusted test. LAN sharing uses HTTP and is limited to the current private subnet. Public HTTPS opens TCP `80` and `443`; remote voice opens TCP `17881` and UDP `17882`. Router forwarding is a separate manual step.
5. On the first run, the launcher creates a private `.env` at `%LOCALAPPDATA%\NEXUS\Server\.env` with new secrets. Docker Compose builds images that are missing; that first build can take a long time. Later starts reuse the existing images instead of forcing a rebuild. After updating server source, run `Start-NEXUS-Server.cmd -RebuildImages` to rebuild them.
6. Open the server address printed by the launcher on the server computer. When LAN sharing is enabled, current NEXUS desktop clients on the same subnet discover a `NEXUS server` card automatically; no one needs to type its address. When sharing is declined, the server remains local to this computer.

The new stack uses the separate Docker Compose project `nexus-host-local`, a separate local `.env`, and separate Docker volumes. Existing containers and volumes are left untouched. The database and uploads live in Docker's persistent volumes. `Stop-NEXUS-Server.cmd` stops only this new stack without deleting its volumes. Do not run `docker compose down -v` unless you intend to erase this server's data.

## Public HTTPS access

To use the fixed `https://nexus-nn.duckdns.org` address from outside the home:

1. Enable the launcher's public HTTPS option on a trusted home network. It binds Caddy to the computer's private LAN address on TCP `80` and `443`, keeps a separate local `8081` address for the owner's session, and adds Windows Firewall rules on the Private profile only.
2. Keep the `nexus-nn` DuckDNS record pointed at the router's current public IPv4 address. In the router, forward external TCP `80` and `443` to the Windows computer's private LAN IPv4 address on the same ports.
3. Keep the PC, Docker Desktop, and NEXUS server running during the test. Caddy obtains and renews HTTPS certificates when the hostname resolves to this router and the internet can reach the forwarded ports.
4. This requires a public IPv4 address. Carrier-grade NAT, a second unconfigured router, or an ISP blocking inbound ports prevents direct access. Do not use router DMZ mode.
5. The address becomes unavailable when the PC/server is stopped. Remove the router forwards when remote testing is no longer needed. Do not enable public access on public or guest Wi-Fi.

The default local setup does not expose web/API ports. Setting `PublicOrigin` or adding a DuckDNS record alone does not create public HTTPS access.

## Network limits

LAN discovery works only while the server is running and the friend is on the same local subnet. The firewall rules are removed when the server stops. Do not enable LAN sharing on public or guest Wi-Fi.

Remote web/API access and voice media are separate paths. A web tunnel does not carry LiveKit's UDP/TCP media ports. To test remote voice:

1. On a trusted home network, start the server as Administrator and answer `y` to the remote-voice question. The launcher opens inbound TCP `17881` and UDP `17882` on the Windows Private firewall profile only. It does not open the web/API port to the internet.
2. In the home router, forward external TCP `17881` to this PC's LAN IPv4 address on TCP `17881`, and external UDP `17882` to the same PC on UDP `17882`. Reserve the PC's LAN address in the router first so it does not change.
3. The router must have a public IPv4 address. Port forwarding will not work behind carrier-grade NAT or an additional router unless that upstream network is configured too. Do not use router DMZ mode.
4. Keep the PC, Docker Desktop, and server running during the test. The Windows firewall rules are removed when the server is stopped; the router forwarding entries should be removed when remote testing is no longer needed.
5. The remote friend's network may block UDP. LiveKit also has its TCP media port, but opening these ports cannot guarantee connectivity through every restrictive network.

This is an on-demand test setup, not a permanent public service. Do not enable remote voice on public or guest Wi-Fi, and do not use a Replit preview URL as the permanent server address.

Email delivery is disabled in the local test configuration. The owner should choose username sign-in for this trial; never share the server's `.env` file or commit it to GitHub.
