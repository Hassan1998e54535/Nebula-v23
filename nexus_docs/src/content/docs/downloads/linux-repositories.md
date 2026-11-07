---
# SPDX-License-Identifier: Nebula
title: Linux repositories
description: The apt, dnf, pacman and Flatpak repositories NEXUS publishes, and how a client adds them.
---

NEXUS publishes four Linux repositories. In every one the package is `nexus` for stable and `nexus-canary` for canary. The apt and dnf entrypoints each subscribe to one channel, so the file you install decides which of the two you track. pacman and Flatpak work the other way. One repository serves both channels, and the package name or application id selects it.

## apt

One repository serves Debian and Ubuntu. It uses the standard `dists` and `pool` layout, publishes both SHA256 and SHA512 by-hash indexes, and is signed.

```
sudo install -d -m 0755 /etc/apt/keyrings
sudo curl -fsSL -o /etc/apt/keyrings/nexus-archive-keyring.gpg \
  https://pkgs.nexus.com/keys/nexus-archive-keyring.gpg
sudo curl -fsSL -o /etc/apt/sources.list.d/nexus.sources \
  https://pkgs.nexus.com/deb/nexus.sources
sudo apt update && sudo apt install nexus
```

For the canary channel, add `nexus-canary.sources` and install `nexus-canary`.

```
sudo curl -fsSL -o /etc/apt/sources.list.d/nexus-canary.sources \
  https://pkgs.nexus.com/deb/nexus-canary.sources
sudo apt update && sudo apt install nexus-canary
```

The stable entry does not list `nexus-canary`. A canary `.deb` installed from a download stays on its version until the canary entry is added.

The `.sources` entry uses `Signed-By` rather than `Trusted: yes`, so `apt update` verifies the repository and prints nothing.

## dnf

One repository serves Fedora and the RHEL family, split by channel and architecture. It is signed, with both `gpgcheck` and `repo_gpgcheck` enabled.

```
sudo curl -fsSL -o /etc/yum.repos.d/nexus.repo \
  https://pkgs.nexus.com/rpm/nexus.repo
sudo rpm --import https://pkgs.nexus.com/keys/nexus-archive-keyring.asc
sudo dnf install nexus
```

The `.repo` file names the signing key by URL, so dnf fetches it rather than needing the keyring step the apt entry has. Without the `rpm --import` line dnf asks to import twice on a first install, once for the repository metadata and once for the package. With it dnf asks once, for the metadata, which dnf keeps in its own key store. Both prompts print the fingerprint, which reads `09D01339EE128925F75E675C855C5BDE34D205D2`.

For the canary channel, add `nexus-canary.repo` and install `nexus-canary`.

```
sudo curl -fsSL -o /etc/yum.repos.d/nexus-canary.repo \
  https://pkgs.nexus.com/rpm/nexus-canary.repo
sudo dnf install nexus-canary
```

Metadata expires after six hours, so a freshly published build becomes visible within that window, or immediately with `dnf --refresh upgrade`.

:::caution[RHEL, Rocky, Alma and CentOS Stream need EPEL]
The package depends on `libXScrnSaver`, which the EL base repositories do not ship. Run `sudo dnf install epel-release` first. Fedora does not need this.
:::

## pacman

One repository named `nexus` holds both channels. It is signed, and pacman verifies both the sync database and every package.

pacman has no per-repository key setting, so the signing key goes into the pacman keyring once:

```
sudo pacman-key --init
curl -fsSL -o /tmp/nexus-archive-keyring.asc \
  https://pkgs.nexus.com/keys/nexus-archive-keyring.asc
sudo pacman-key --add /tmp/nexus-archive-keyring.asc
sudo pacman-key --lsign-key 09D01339EE128925F75E675C855C5BDE34D205D2
```

`--lsign-key` is the step that makes pacman trust the key. Without it the key sits in the keyring and pacman still refuses the repository with `unknown trust`. The fingerprint above is the one NEXUS uses for apt and dnf as well.

Then add the repository:

```
sudo tee -a /etc/pacman.conf >/dev/null <<'REPO'

[nexus]
SigLevel = Required TrustedOnly
Server = https://pkgs.nexus.com/arch/$repo/os/$arch
REPO
sudo pacman -Syu --noconfirm nexus
```

Install `nexus-canary` instead for the canary channel. Both come from this one repository and install alongside each other.

Write `$repo` and `$arch` literally. Both are pacman variables, not shell ones, which is why the heredoc above is quoted. `$repo` expands to the section name, so the `Server` line needs no editing.

`Required TrustedOnly` is pacman's built-in default written out in full. Arch ships `Required DatabaseOptional` in `/etc/pacman.conf` because the official repositories do not sign their databases. NEXUS signs both the database and every package, so leaving the `SigLevel` line out would inherit that weaker default rather than match the line above.

A pacman sync database records one version per package name, so only the current release is installable by name. An older build is still served, and `curl` followed by `pacman -U ./<file>` installs it.

## Flatpak

One remote named `nexus` serves both application ids, `app.nexus.NEXUS` and `app.nexus.NEXUSCanary`.

```
flatpak install https://pkgs.nexus.com/flatpak/nexus.flatpakref
```

Use `nexus-canary.flatpakref` for the canary channel. The reference file names the remote and resolves the runtime the application builds against, so this works on a machine with no remotes configured.

Once the remote exists, either application installs by id:

```
flatpak install nexus app.nexus.NEXUSCanary
```

The reference file names the signing key, so flatpak configures the remote verified and imports the key. `nexus.flatpakrepo` does the same, so `flatpak remote-add` from that URL needs no flag either. Adding the bare repository URL skips both files: flatpak still turns verification on but has no key to check against, so that route needs `--gpg-import` or `--no-gpg-verify`.
