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
$serverOrigin = $localOrigin
$shareWithLan = $false
$firewallGroup = 'NEXUS Local Server'
$discoveryPidPath = Join-Path $serverDataDir 'lan-discovery.pid'

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

function Get-PreferredLanIPv4 {
    try {
        $routes = @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -AddressFamily IPv4 -ErrorAction Stop |
            Sort-Object RouteMetric)
        foreach ($route in $routes) {
            $addresses = @(Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction Stop |
                Where-Object { $_.AddressState -eq 'Preferred' })
            foreach ($candidate in $addresses) {
                $bytes = [System.Net.IPAddress]::Parse($candidate.IPAddress).GetAddressBytes()
                $isPrivate = $bytes[0] -eq 10 -or
                    ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
                    ($bytes[0] -eq 192 -and $bytes[1] -eq 168)
                if ($isPrivate) {
                    return $candidate.IPAddress
                }
            }
        }
    } catch {
        return $null
    }
    return $null
}

function Set-LocalEnvironmentValues([hashtable]$Values) {
    $written = [System.Collections.Generic.HashSet[string]]::new()
    $lines = foreach ($line in [System.IO.File]::ReadAllLines($envPath)) {
        if ($line -match '^(?<name>[A-Z0-9_]+)=(?<value>.*)$' -and $Values.ContainsKey($Matches.name)) {
            $name = $Matches.name
            [void]$written.Add($name)
            "$name=$($Values[$name])"
        } else {
            $line
        }
    }
    foreach ($name in $Values.Keys) {
        if (-not $written.Contains($name)) {
            $lines += "$name=$($Values[$name])"
        }
    }
    $encoding = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($envPath, (($lines -join "`n") + "`n"), $encoding)
}

function Remove-LanFirewallRules {
    Get-NetFirewallRule -Group $firewallGroup -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule -ErrorAction SilentlyContinue
}

function Stop-LanDiscoveryResponder {
    if (-not (Test-Path -LiteralPath $discoveryPidPath)) {
        return
    }
    $processId = 0
    if ([int]::TryParse([System.IO.File]::ReadAllText($discoveryPidPath).Trim(), [ref]$processId)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if ($process -and $process.CommandLine -like '*NEXUS-LanDiscovery.ps1*') {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $discoveryPidPath -Force -ErrorAction SilentlyContinue
}

function Add-LanFirewallRules([string]$LanAddress) {
    Remove-LanFirewallRules
    $rules = @(
        @{Name = 'NEXUS web'; Protocol = 'TCP'; Port = '8081'}
        @{Name = 'NEXUS voice TCP'; Protocol = 'TCP'; Port = '17881'}
        @{Name = 'NEXUS voice UDP'; Protocol = 'UDP'; Port = '17882'}
        @{Name = 'NEXUS discovery'; Protocol = 'UDP'; Port = '18777'}
    )
    foreach ($rule in $rules) {
        New-NetFirewallRule `
            -DisplayName $rule.Name `
            -Group $firewallGroup `
            -Direction Inbound `
            -Action Allow `
            -Protocol $rule.Protocol `
            -LocalAddress $LanAddress `
            -LocalPort $rule.Port `
            -RemoteAddress LocalSubnet `
            -Profile Private | Out-Null
    }
}

function Start-LanDiscoveryResponder {
    Stop-LanDiscoveryResponder
    $listenerPath = Join-Path $PSScriptRoot 'NEXUS-LanDiscovery.ps1'
    if (-not (Test-Path -LiteralPath $listenerPath)) {
        throw "Missing LAN discovery listener: $listenerPath"
    }
    $arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$listenerPath`""
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden -PassThru
    Start-Sleep -Milliseconds 300
    if ($process.HasExited) {
        throw 'The local-network discovery listener did not start.'
    }
    [System.IO.File]::WriteAllText($discoveryPidPath, [string]$process.Id)
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

    Stop-LanDiscoveryResponder
    $lanAddress = Get-PreferredLanIPv4
    if ($null -ne $lanAddress) {
        Write-Host "A private-network address was found: $lanAddress"
        Write-Warning 'LAN testing uses unencrypted HTTP. Other devices on this trusted private network could observe traffic. Never enable it on public or guest Wi-Fi.'
        $lanAnswer = Read-Host 'Allow NEXUS devices on this private Wi-Fi network to connect? [y/N]'
        $shareWithLan = $lanAnswer -match '^(?i:y|yes)$'
    } else {
        Write-Host 'No private IPv4 network was found; NEXUS will remain local to this computer.'
    }

    if ($shareWithLan) {
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
        if (-not $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
            throw 'LAN sharing needs administrator permission to add private-network firewall rules. Reopen Start-NEXUS-Server.cmd as Administrator.'
        }
        $serverOrigin = "http://${lanAddress}:8081"
        Set-LocalEnvironmentValues @{
            NEXUS_DOMAIN = $lanAddress
            NEXUS_PUBLIC_SCHEME = 'http'
            NEXUS_PUBLIC_PORT = '8081'
            NEXUS_PUBLIC_ORIGIN = $serverOrigin
            NEXUS_HTTP_PORT = "${lanAddress}:8081"
            NEXUS_LIVEKIT_BIND_IP = $lanAddress
            NEXUS_LIVEKIT_TCP_PORT = '17881'
            NEXUS_LIVEKIT_UDP_PORT = '17882'
            NEXUS_LIVEKIT_USE_EXTERNAL_IP = 'false'
            NEXUS_LIVEKIT_NODE_IP = $lanAddress
        }
        Add-LanFirewallRules $lanAddress
        Write-Host 'LAN sharing is limited to the current private subnet and Windows Private firewall profile.'
        Write-Warning 'Use this only on a trusted home network. This local test uses HTTP and is not for public Wi-Fi or internet exposure.'
    } else {
        $serverOrigin = $localOrigin
        Set-LocalEnvironmentValues @{
            NEXUS_DOMAIN = 'localhost'
            NEXUS_PUBLIC_SCHEME = 'http'
            NEXUS_PUBLIC_PORT = '8081'
            NEXUS_PUBLIC_ORIGIN = $localOrigin
            NEXUS_HTTP_PORT = '127.0.0.1:8081'
            NEXUS_LIVEKIT_BIND_IP = '127.0.0.1'
            NEXUS_LIVEKIT_TCP_PORT = '17881'
            NEXUS_LIVEKIT_UDP_PORT = '17882'
            NEXUS_LIVEKIT_USE_EXTERNAL_IP = 'true'
            NEXUS_LIVEKIT_NODE_IP = ''
        }
        Remove-LanFirewallRules
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

    if ($shareWithLan) {
        Write-Host 'Waiting for the NEXUS web endpoint to become ready before announcing it on the local network...'
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            try {
                $null = Invoke-WebRequest -Uri "$serverOrigin/.well-known/nexus" -UseBasicParsing -TimeoutSec 3
                $ready = $true
                break
            } catch {
                Start-Sleep -Seconds 2
            }
        }
        if (-not $ready) {
            throw 'NEXUS did not become ready at its private-network address. The LAN discovery listener was not started.'
        }
        Start-LanDiscoveryResponder
    }

    Write-Host ''
    Write-Host "NEXUS server address: $serverOrigin"
    if ($shareWithLan) {
        Write-Host 'NEXUS desktop clients on this same private network can discover the server as a named instance.'
        Write-Host 'This does not make the server reachable over the internet.'
    } else {
        Write-Host 'LAN sharing was not enabled; this address works only on this computer.'
    }
    Write-Host 'To stop without deleting accounts or files, run Stop-NEXUS-Server.cmd.'
} catch {
    Stop-LanDiscoveryResponder
    if ($shareWithLan) {
        Remove-LanFirewallRules
    }
    Write-Error $_
    exit 1
}
