# SPDX-License-Identifier: Nebula

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$stackDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverDataDir = Join-Path $env:LOCALAPPDATA 'NEXUS\Server'
$envPath = Join-Path $serverDataDir '.env'
$discoveryPidPath = Join-Path $serverDataDir 'lan-discovery.pid'
$firewallGroup = 'NEXUS Local Server'
if (Test-Path -LiteralPath $discoveryPidPath) {
    $processId = 0
    if ([int]::TryParse([System.IO.File]::ReadAllText($discoveryPidPath).Trim(), [ref]$processId)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if ($process -and $process.CommandLine -like '*NEXUS-LanDiscovery.ps1*') {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $discoveryPidPath -Force -ErrorAction SilentlyContinue
}

Get-NetFirewallRule -Group $firewallGroup -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue

if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error "No server .env exists at $envPath."
    exit 1
}

$composeArgs = @(
    '--project-name', 'nexus-host-local',
    '--project-directory', $stackDir,
    '--env-file', $envPath,
    '-f', (Join-Path $stackDir 'docker-compose.yml'),
    '-f', (Join-Path $stackDir 'docker-compose.source.yml'),
    '-f', (Join-Path $stackDir 'tunnel.compose.yml'),
    'down'
)
& docker compose @composeArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose down failed with exit code $LASTEXITCODE."
    exit 1
}

Write-Host 'NEXUS is stopped. Docker volumes were not removed; accounts and uploads remain on this PC.'
