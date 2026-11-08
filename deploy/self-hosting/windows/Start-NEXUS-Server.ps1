# SPDX-License-Identifier: Nebula

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$stackDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$templatePath = Join-Path $stackDir '.env.example'
$serverDataDir = Join-Path $env:LOCALAPPDATA 'NEXUS\Server'
$envPath = Join-Path $serverDataDir '.env'
$composeProjectName = 'nexus-host-local'
$localOrigin = 'http://localhost:8081'

function New-RandomHex([int]$Count = 32) {
    $bytes = New-Object byte[] $Count
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
}

function ConvertTo-Base64Url([byte[]]$Bytes) {
    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function New-VapidKeyPair {
    $curve = [System.Security.Cryptography.ECCurve]::CreateFromValue(
        '1.2.840.10045.3.1.7'
    )
    $key = [System.Security.Cryptography.ECDsa]::Create(
        $curve
    )
    try {
        $parameters = $key.ExportParameters($true)
        $publicKey = New-Object byte[] 65
        $publicKey[0] = 4
        [Array]::Copy($parameters.Q.X, 0, $publicKey, 1, 32)
        [Array]::Copy($parameters.Q.Y, 0, $publicKey, 33, 32)
        return @{
            NEXUS_VAPID_PUBLIC_KEY = ConvertTo-Base64Url $publicKey
            NEXUS_VAPID_PRIVATE_KEY = ConvertTo-Base64Url $parameters.D
        }
    } finally {
        $key.Dispose()
    }
}

function Write-LocalEnvironment {
    if (-not (Test-Path -LiteralPath $templatePath)) {
        throw "Missing self-hosted template: $templatePath"
    }

    New-Item -ItemType Directory -Path $serverDataDir -Force | Out-Null

    $overrides = @{
        NEXUS_DOMAIN = 'localhost'
        NEXUS_PUBLIC_SCHEME = 'http'
        NEXUS_PUBLIC_PORT = '8081'
        NEXUS_PUBLIC_ORIGIN = $localOrigin
        NEXUS_HTTP_PORT = '127.0.0.1:8081'
        NEXUS_REGISTRY = 'local'
        NEXUS_REGISTRY_OWNER = 'hassan1998e54535'
        NEXUS_IMAGE_TAG = 'source'
        NEXUS_EMAIL_ENABLED = 'false'
        NEXUS_LIVEKIT_TCP_PORT = '17881'
        NEXUS_LIVEKIT_UDP_PORT = '17882'
    }
    foreach ($entry in (New-VapidKeyPair).GetEnumerator()) {
        $overrides[$entry.Key] = $entry.Value
    }

    $written = [System.Collections.Generic.HashSet[string]]::new()
    $lines = foreach ($line in [System.IO.File]::ReadAllLines($templatePath)) {
        if ($line -match '^(?<name>[A-Z0-9_]+)=(?<value>.*)$') {
            $name = $Matches.name
            $value = $Matches.value
            if ($overrides.ContainsKey($name)) {
                [void]$written.Add($name)
                "$name=$($overrides[$name])"
            } elseif ($value -eq 'CHANGE_ME') {
                if ($name.EndsWith('_BASE64')) {
                    $bytes = New-Object byte[] 32
                    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
                    try {
                        $rng.GetBytes($bytes)
                    } finally {
                        $rng.Dispose()
                    }
                    "$name=$([Convert]::ToBase64String($bytes))"
                } else {
                    "$name=$(New-RandomHex)"
                }
            } else {
                $line
            }
        } else {
            $line
        }
    }

    foreach ($name in $overrides.Keys) {
        if (-not $written.Contains($name)) {
            $lines += "$name=$($overrides[$name])"
        }
    }

    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($envPath, (($lines -join "`n") + "`n"), $encoding)

    try {
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
        $acl = [System.Security.AccessControl.FileSecurity]::new()
        $acl.SetAccessRuleProtection($true, $false)
        $acl.SetOwner($identity.User)
        $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
            $identity.User,
            [System.Security.AccessControl.FileSystemRights]::FullControl,
            [System.Security.AccessControl.AccessControlType]::Allow
        )
        [void]$acl.AddAccessRule($rule)
        Set-Acl -LiteralPath $envPath -AclObject $acl
    } catch {
        throw "Could not restrict access to the generated .env file: $($_.Exception.Message)"
    }

    Write-Host 'Created a private .env for local-only testing. It contains generated secrets; do not share it.'
}

function Get-EnvironmentValue([string]$Name) {
    $line = [System.IO.File]::ReadAllLines($envPath) |
        Where-Object { $_ -match "^$([regex]::Escape($Name))=" } |
        Select-Object -Last 1
    if ($null -eq $line) {
        return ''
    }
    return $line.Substring($Name.Length + 1)
}

function Invoke-NexusCompose([string[]]$Arguments) {
    $composeArgs = @(
        '--parallel', '2',
        '--project-name', $composeProjectName,
        '--project-directory', $stackDir,
        '--env-file', $envPath,
        '-f', (Join-Path $stackDir 'docker-compose.yml'),
        '-f', (Join-Path $stackDir 'docker-compose.source.yml'),
        '-f', (Join-Path $stackDir 'tunnel.compose.yml')
    ) + $Arguments
    & docker compose @composeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE"
    }
}

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker Desktop is required. Install it with the WSL2 Linux-container engine, then start Docker Desktop.'
    }
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop is installed but its engine is not running. Start Docker Desktop and run this file again.'
    }
    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Compose v2 is required. Update Docker Desktop.'
    }

    if (-not (Test-Path -LiteralPath $envPath)) {
        Write-LocalEnvironment
    }

    $placeholders = @(
        [System.IO.File]::ReadAllLines($envPath) |
            Where-Object { $_ -match '^[A-Z0-9_]+=CHANGE_ME$' }
    )
    if ($placeholders.Count -gt 0) {
        throw "The existing .env still contains CHANGE_ME values. Fix them first; this script will not replace your secrets."
    }
    if ((Get-EnvironmentValue 'NEXUS_REGISTRY') -ne 'local' -or
        (Get-EnvironmentValue 'NEXUS_IMAGE_TAG') -ne 'source') {
        throw 'The existing .env is not configured for a local source build. It was left unchanged. Set NEXUS_REGISTRY=local and NEXUS_IMAGE_TAG=source only after backing up your current setup.'
    }

    Write-Host 'Validating the local Compose stack...'
    Invoke-NexusCompose @('config', '--quiet')
    Write-Host 'Building NEXUS services from this source tree with Compose parallelism limited to 2 to reduce memory pressure. The first build may take a long time.'
    Invoke-NexusCompose @('up', '--build', '-d')

    Write-Host ''
    Write-Host "Local server URL: $localOrigin"
    Write-Host 'This address works only on this computer. A friend cannot reach it over the internet yet.'
    Write-Host 'To stop without deleting accounts or files, run Stop-NEXUS-Server.cmd.'
} catch {
    Write-Error $_
    exit 1
}
