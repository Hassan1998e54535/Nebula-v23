# SPDX-License-Identifier: Nebula

[CmdletBinding()]
param(
    [int]$DiscoveryPort = 18777,
    [int]$HttpPort = 8081
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$requestText = 'NEXUS_LAN_DISCOVERY_V1'
$responseBytes = [System.Text.Encoding]::ASCII.GetBytes("NEXUS_LAN_RESPONSE_V1:$HttpPort")
$udp = [System.Net.Sockets.UdpClient]::new($DiscoveryPort)

try {
    while ($true) {
        $remote = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, 0)
        $bytes = $udp.Receive([ref]$remote)
        $request = [System.Text.Encoding]::ASCII.GetString($bytes)
        if ($request -ne $requestText) {
            continue
        }

        [void]$udp.Send($responseBytes, $responseBytes.Length, $remote)
    }
} finally {
    $udp.Dispose()
}
