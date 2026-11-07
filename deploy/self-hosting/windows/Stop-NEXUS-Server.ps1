# SPDX-License-Identifier: Nebula

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$stackDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $stackDir '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    Write-Error "No server .env exists at $envPath."
    exit 1
}

$composeArgs = @(
    '--project-name', 'nexus',
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
