# SPDX-License-Identifier: Nebula

[CmdletBinding()]
param(
    [switch]$RebuildImages,
    [string]$PublicOrigin = 'https://nexus-nn.duckdns.org'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$stackDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$templatePath = Join-Path $stackDir '.env.example'
$serverDataDir = Join-Path $env:LOCALAPPDATA 'NEXUS\Server'
$envPath = Join-Path $serverDataDir '.env'
$composeProjectName = 'nexus-host-local'
$localOrigin = 'http://localhost:8081'
$serverOrigin = $localOrigin
$publicOriginUri = $null
try {
    $publicOriginUri = [System.Uri]::new($PublicOrigin, [System.UriKind]::Absolute)
} catch {
    throw 'PublicOrigin must be an absolute HTTPS origin, such as https://nexus.example.com.'
}
if ($publicOriginUri.Scheme -ne 'https' -or
    $publicOriginUri.UserInfo -ne '' -or
    $publicOriginUri.AbsolutePath -ne '/' -or
    $publicOriginUri.Query -ne '' -or
    $publicOriginUri.Fragment -ne '') {
    throw 'PublicOrigin must be an HTTPS origin with no path, query, or credentials.'
}
$publicOrigin = $publicOriginUri.GetLeftPart([System.UriPartial]::Authority)
$shareWithLan = $false
$shareWebWithInternet = $false
$shareVoiceWithInternet = $false
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
        NEXUS_PUBLIC_ORIGIN = $publicOrigin
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

function Add-RemoteVoiceFirewallRules([string]$LanAddress) {
    $rules = @(
        @{Name = 'NEXUS remote voice TCP'; Protocol = 'TCP'; Port = '17881'}
        @{Name = 'NEXUS remote voice UDP'; Protocol = 'UDP'; Port = '17882'}
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
            -RemoteAddress Any `
            -Profile Private | Out-Null
    }
}

function Add-RemoteWebFirewallRules([string]$LanAddress) {
    $rules = @(
        @{Name = 'NEXUS remote web HTTP'; Protocol = 'TCP'; Port = '80'}
        @{Name = 'NEXUS remote web HTTPS'; Protocol = 'TCP'; Port = '443'}
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
            -RemoteAddress Any `
            -Profile Private | Out-Null
    }
}

function Start-LanDiscoveryResponder([string]$LanAddress) {
    Stop-LanDiscoveryResponder
    $listenerPath = Join-Path $PSScriptRoot 'NEXUS-LanDiscovery.ps1'
    if (-not (Test-Path -LiteralPath $listenerPath)) {
        throw "Missing LAN discovery listener: $listenerPath"
    }
    $arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File `"$listenerPath`" -LanAddress $LanAddress"
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
        '-f', (Join-Path $stackDir 'docker-compose.source.yml')
    ) + $Arguments
    if (-not $shareWebWithInternet) {
        $composeArgs += @('-f', (Join-Path $stackDir 'tunnel.compose.yml'))
    }
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

        Write-Warning 'Remote voice requires router port forwarding and exposes only the LiveKit voice ports to internet traffic. Do not continue on public or guest Wi-Fi.'
        $remoteVoiceAnswer = Read-Host 'Allow friends outside this network to connect to NEXUS voice? [y/N]'
        $shareVoiceWithInternet = $remoteVoiceAnswer -match '^(?i:y|yes)$'

        Write-Warning "Public web access exposes NEXUS over HTTPS at $publicOrigin. Forward TCP 80 and 443 to this computer, and use only a trusted home network."
        $remoteWebAnswer = Read-Host 'Allow friends outside this network to access NEXUS over HTTPS? [y/N]'
        $shareWebWithInternet = $remoteWebAnswer -match '^(?i:y|yes)$'
    } else {
        Write-Host 'No private IPv4 network was found; NEXUS will remain local to this computer.'
    }

    if ($shareWithLan -or $shareVoiceWithInternet -or $shareWebWithInternet) {
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = [System.Security.Principal.WindowsPrincipal]::new($identity)
        if (-not $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
            throw 'Network sharing needs administrator permission to add Windows Firewall rules. Reopen Start-NEXUS-Server.cmd as Administrator.'
        }
    }

    if ($shareWebWithInternet) {
        $localWebOrigin = if ($shareWithLan) { "http://${lanAddress}:8081" } else { $localOrigin }
        $serverOrigin = if ($shareWithLan) { $localWebOrigin } else { $localOrigin }
        $siteAddresses = "https://$($publicOriginUri.DnsSafeHost), $localWebOrigin"
        $localHttpBind = if ($shareWithLan) { "${lanAddress}:8081" } else { '127.0.0.1:8081' }
        Set-LocalEnvironmentValues @{
            NEXUS_DOMAIN = $publicOriginUri.DnsSafeHost
            NEXUS_PUBLIC_SCHEME = 'https'
            NEXUS_PUBLIC_PORT = '443'
            NEXUS_PUBLIC_ORIGIN = $publicOrigin
            NEXUS_EDGE_SITE_ADDRESS = $siteAddresses
            NEXUS_HTTP_PORT = "${lanAddress}:80"
            NEXUS_HTTPS_PORT = "${lanAddress}:443"
            NEXUS_LOCAL_HTTP_BIND = $localHttpBind
            NEXUS_LIVEKIT_BIND_IP = if ($shareVoiceWithInternet -or $shareWithLan) { $lanAddress } else { '127.0.0.1' }
            NEXUS_LIVEKIT_TCP_PORT = '17881'
            NEXUS_LIVEKIT_UDP_PORT = '17882'
            NEXUS_LIVEKIT_USE_EXTERNAL_IP = [string]$shareVoiceWithInternet
            NEXUS_LIVEKIT_NODE_IP = if ($shareVoiceWithInternet) { '' } else { $lanAddress }
        }
        if ($shareWithLan) {
            Add-LanFirewallRules $lanAddress
        } else {
            Remove-LanFirewallRules
        }
        Add-RemoteWebFirewallRules $lanAddress
    } elseif ($shareWithLan) {
        $serverOrigin = "http://${lanAddress}:8081"
        Set-LocalEnvironmentValues @{
            NEXUS_DOMAIN = $lanAddress
            NEXUS_PUBLIC_SCHEME = 'http'
            NEXUS_PUBLIC_PORT = '8081'
            NEXUS_PUBLIC_ORIGIN = $publicOrigin
            NEXUS_HTTP_PORT = "${lanAddress}:8081"
            NEXUS_LIVEKIT_BIND_IP = $lanAddress
            NEXUS_LIVEKIT_TCP_PORT = '17881'
            NEXUS_LIVEKIT_UDP_PORT = '17882'
            NEXUS_LIVEKIT_USE_EXTERNAL_IP = [string]$shareVoiceWithInternet
            NEXUS_LIVEKIT_NODE_IP = $(if ($shareVoiceWithInternet) { '' } else { $lanAddress })
        }
        Add-LanFirewallRules $lanAddress
        Write-Host 'LAN sharing is limited to the current private subnet and Windows Private firewall profile.'
        Write-Warning 'Use this only on a trusted home network. This local test uses HTTP and is not for public Wi-Fi or internet exposure.'
    } else {
        $serverOrigin = $localOrigin
        $voiceBindAddress = if ($shareVoiceWithInternet) { $lanAddress } else { '127.0.0.1' }
        Set-LocalEnvironmentValues @{
            NEXUS_DOMAIN = 'localhost'
            NEXUS_PUBLIC_SCHEME = 'http'
            NEXUS_PUBLIC_PORT = '8081'
            NEXUS_PUBLIC_ORIGIN = $publicOrigin
            NEXUS_HTTP_PORT = '127.0.0.1:8081'
            NEXUS_LIVEKIT_BIND_IP = $voiceBindAddress
            NEXUS_LIVEKIT_TCP_PORT = '17881'
            NEXUS_LIVEKIT_UDP_PORT = '17882'
            NEXUS_LIVEKIT_USE_EXTERNAL_IP = 'true'
            NEXUS_LIVEKIT_NODE_IP = ''
        }
        Remove-LanFirewallRules
    }

    if ($shareVoiceWithInternet) {
        Add-RemoteVoiceFirewallRules $lanAddress
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
    if ($RebuildImages) {
        Write-Host 'Rebuilding NEXUS service images from source. This can take a long time.'
        Invoke-NexusCompose @('up', '--build', '-d')
    } else {
        Write-Host 'Starting NEXUS without forcing image rebuilds; Compose builds services whose images are missing.'
        Write-Host 'After updating server source, run Start-NEXUS-Server.cmd -RebuildImages to rebuild it.'
        Invoke-NexusCompose @('up', '-d')
    }

    if ($shareWithLan -or $shareWebWithInternet) {
        $readyOrigin = if ($shareWithLan) { $serverOrigin } else { $localOrigin }
        Write-Host 'Waiting for the NEXUS web endpoint to become ready...'
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            try {
                $null = Invoke-WebRequest -Uri "$readyOrigin/.well-known/nexus" -UseBasicParsing -TimeoutSec 3
                $ready = $true
                break
            } catch {
                Start-Sleep -Seconds 2
            }
        }
        if (-not $ready) {
            throw 'NEXUS did not become ready at its private-network address. The LAN discovery listener was not started.'
        }
        Start-LanDiscoveryResponder $lanAddress
    }

    Write-Host ''
    Write-Host "NEXUS server address: $serverOrigin"
    if ($shareWithLan) {
        Write-Host 'NEXUS desktop clients on this same private network can discover the server as a named instance.'
    }
    if ($shareWebWithInternet) {
        Write-Warning 'The Windows firewall now permits public web traffic on TCP 80 and 443 from any internet address.'
        Write-Host "In your router, forward TCP 80 and 443 to this PC at $lanAddress, keeping the external and internal port numbers the same."
        Write-Host "Friends outside your network should use the HTTPS address: $publicOrigin"
        Write-Host 'The DuckDNS record must point to this router’s public IPv4 address. Caddy can issue TLS only when the domain and router forwarding are reachable from the internet.'
        Write-Host 'A carrier-grade NAT or another unconfigured upstream router prevents direct port forwarding.'
    }
    if ($shareVoiceWithInternet) {
        Write-Warning 'The Windows firewall now permits inbound voice traffic on TCP 17881 and UDP 17882 from any internet address.'
        Write-Host "In your router, forward TCP 17881 and UDP 17882 to this PC at $lanAddress, keeping the external and internal port numbers the same."
        Write-Host 'Reserve this PC’s LAN address in the router, or the port-forward target may change.'
        Write-Host 'The router must have a public IPv4 address; carrier-grade NAT or a second upstream router can prevent port forwarding.'
        Write-Host 'This does not forward the NEXUS web/API port. The current HTTPS tunnel handles that separately and may change when restarted.'
        Write-Host 'If voice still stays on Connecting, the friend’s network may block UDP; the LiveKit TCP path uses TCP 17881.'
    } elseif (-not $shareWithLan) {
        Write-Host 'LAN and remote sharing are off; this address works only on this computer.'
    }
    Write-Host 'To stop without deleting accounts or files, run Stop-NEXUS-Server.cmd.'
} catch {
    Stop-LanDiscoveryResponder
    if ($shareWithLan -or $shareWebWithInternet -or $shareVoiceWithInternet) {
        Remove-LanFirewallRules
    }
    Write-Error $_
    exit 1
}
