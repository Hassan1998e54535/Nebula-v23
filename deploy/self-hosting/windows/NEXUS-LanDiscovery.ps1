# SPDX-License-Identifier: Nebula

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$LanAddress,
    [int]$DiscoveryPort = 18777,
    [int]$HttpPort = 8081
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$requestText = 'NEXUS_LAN_DISCOVERY_V1'
$responseBytes = [System.Text.Encoding]::ASCII.GetBytes("NEXUS_LAN_RESPONSE_V1:$HttpPort")
$networkAddress = [System.Net.IPAddress]::Parse($LanAddress).GetAddressBytes()
$networkConfig = Get-NetIPAddress -AddressFamily IPv4 -IPAddress $LanAddress -ErrorAction Stop |
    Select-Object -First 1
$prefixLength = $networkConfig.PrefixLength
$prefixRemaining = $prefixLength
$subnetMask = @(
    foreach ($index in 0..3) {
        if ($prefixRemaining -ge 8) {
            $prefixRemaining -= 8
            255
        } elseif ($prefixRemaining -gt 0) {
            $maskByte = 256 - [Math]::Pow(2, 8 - $prefixRemaining)
            $prefixRemaining = 0
            [byte]$maskByte
        } else {
            0
        }
    }
)

function Test-SameSubnet([System.Net.IPAddress]$Address) {
    if ($Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        return $false
    }
    $remoteAddress = $Address.GetAddressBytes()
    for ($index = 0; $index -lt 4; $index++) {
        if (($remoteAddress[$index] -band $subnetMask[$index]) -ne ($networkAddress[$index] -band $subnetMask[$index])) {
            return $false
        }
    }
    return $true
}

$udp = [System.Net.Sockets.UdpClient]::new($DiscoveryPort)

try {
    while ($true) {
        $remote = [System.Net.IPEndPoint]::new([System.Net.IPAddress]::Any, 0)
        $bytes = $udp.Receive([ref]$remote)
        $request = [System.Text.Encoding]::ASCII.GetString($bytes)
        if ($request -ne $requestText -or -not (Test-SameSubnet $remote.Address)) {
            continue
        }

        [void]$udp.Send($responseBytes, $responseBytes.Length, $remote)
    }
} finally {
    $udp.Dispose()
}
