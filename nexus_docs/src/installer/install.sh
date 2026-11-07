#!/bin/sh
# SPDX-License-Identifier: Nebula
#
# Nexus self-hosting installer and upgrader for Linux and macOS.
#
# Three modes, one file:
#
#   default     Check the host, download the stack files, write .env with every
#               value the stack requires, start the containers.
#   --update    Upgrade an instance that already exists. Record the running
#               images, back up, refresh the stack files, pull, recreate, verify.
#   --rollback  Put the images and the stack files of the last recorded upgrade
#               back.
#
# Why one script and not a separate upgrader: an upgrade needs the host checks,
# the stack download, the readiness poll and the health probe that the install
# already has. A second script either copies them or drifts from them, and
# the operator has two downloads and two checksums to verify instead of one.
# The modes share one contract, one digest and one set of exit codes.
#
# This file is also the procedure. Every step of the upgrade includes the command
# an operator types to do that step by hand, and the reason the step exists.
#
# Read this file before you run it. The default mode writes .env, which holds
# every secret the instance has. The upgrade generates a secret only for a key
# the refreshed stack requires that .env does not hold, and rewrites no
# secret. The only value either upgrade mode ever replaces in .env is
# NEXUS_IMAGE_TAG, and only during a rollback that moves off a pinned tag.
#
# Rewriting a secret in .env against volumes that already exist is the one thing
# this script could do that an operator cannot undo. A fresh POSTGRES_PASSWORD
# does not open the existing postgres-data volume, and the instance never starts
# again. Every path below is built so that no run can reach that state.
#
# Exit codes:
#   0    success
#   1    usage error
#   2    unmet prerequisite
#   3    refused to overwrite existing state
#   4    a download failed
#   5    secret generation failed
#   6    the stack did not come up
#   7    a backup failed
#   130  interrupted

set -eu

# The C locale keeps the character ranges in the validation patterns byte based.
# Under a UTF-8 locale a-z also matches uppercase and accented letters.
LC_ALL=C
export LC_ALL

NEXUS_RAW_BASE='https://raw.githubusercontent.com/nexusapp/nexus'
NEXUS_INSTALLER_URL='https://nexus.dev/install.sh'
NEXUS_STACK_PATH='deploy/self-hosting'
NEXUS_MIN_ENGINE='24.0.0'
# Podman numbers its releases on its own scale, so the Docker Engine floor says
# nothing about it. 5.0 is the first release that runs this stack's compose file
# as written, healthcheck conditions and all.
NEXUS_MIN_PODMAN='5.0.0'
NEXUS_MIN_COMPOSE='2.20.2'
# Every overlay this script downloads uses the !override or !reset tag, which
# Compose 2.24.4 reads. A stack that loads none runs on the lower minimum, so the
# higher one is required only once COMPOSE_FILE names more than one file.
NEXUS_MIN_COMPOSE_OVERLAY='2.24.4'
NEXUS_READY_TIMEOUT=600
NEXUS_READY_INTERVAL=5
NEXUS_READY_REPORT=30
NEXUS_VAPID_ATTEMPTS=8
NEXUS_SEC1_HEADER='30770201010420'
NEXUS_INSPECT_FORMAT='{{index .Config.Labels "com.docker.compose.service"}} {{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.State.ExitCode}}'

# The image that copies volumes and measures them. Pinned, because an upgrade
# that reaches for a moving tag to take its backup has one more thing that can
# change under it.
NEXUS_HELPER_IMAGE='alpine:3.22'

# Names inside a record directory. A record is one upgrade: what was running,
# what the stack files said, and the backup taken before the images moved.
NEXUS_RECORD_PREFIX='record-'
NEXUS_IMAGES_FILE='images'
NEXUS_TAG_FILE='image-tag'
NEXUS_DUMP_FILE='nexus.dump'

# Free space demanded before a volume copy, as a percentage of the measured
# volume size. A backup that fills the disk it writes to takes the instance down
# with it.
NEXUS_VOLUME_HEADROOM=110

# The keys .env holds, in the order they are written. The installer iterates
# these two lists, so a key that leaves a list is a key the installer stops
# writing. The docs CI parses the same text and compares it against
# deploy/self-hosting/.env.example.

nexus_non_secret_keys() {
	cat <<'KEYS'
NEXUS_DOMAIN domain
NEXUS_PUBLIC_SCHEME literal https
NEXUS_PUBLIC_PORT literal 443
NEXUS_VAPID_EMAIL email
NEXUS_IMAGE_TAG image_tag
NEXUS_S3_ACCESS_KEY literal nexus
LIVEKIT_API_KEY literal nexus
KEYS
}

nexus_secret_keys() {
	cat <<'KEYS'
POSTGRES_PASSWORD hex
MEILI_MASTER_KEY hex
NEXUS_S3_SECRET_KEY hex
NEXUS_SUDO_MODE_SECRET hex
NEXUS_CONNECTION_INITIATION_SECRET hex
NEXUS_PROFILE_PSEUDONYM_SECRET hex
NEXUS_GATEWAY_RPC_AUTH_TOKEN hex
NEXUS_ERLANG_COOKIE hex
NEXUS_MEDIA_PROXY_SECRET_KEY hex
NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64 base64
NEXUS_ADMIN_SECRET_KEY_BASE hex
NEXUS_ADMIN_OAUTH_CLIENT_SECRET hex
LIVEKIT_API_SECRET hex
NEXUS_SETUP_TOKEN hex
NEXUS_VAPID_PUBLIC_KEY vapid_public
NEXUS_VAPID_PRIVATE_KEY vapid_private
KEYS
}

nexus_stack_files() {
	cat <<'FILES'
docker-compose.yml
docker-compose.proxy.yml
tunnel.compose.yml
external-object-store.compose.yml
Caddyfile
.env.example
FILES
}

nexus_compose_names() {
	cat <<'NAMES'
compose.yaml
compose.yml
docker-compose.yml
docker-compose.yaml
NAMES
}

nexus_compose_name_in() {
	for nexus_candidate in $(nexus_compose_names); do
		if [ -e "$1/$nexus_candidate" ]; then
			printf '%s' "$nexus_candidate"
			return 0
		fi
	done
	return 1
}

nexus_compose_base='docker-compose.yml'
nexus_compose_base_from=''

nexus_placed_name() {
	if [ "$1" = 'docker-compose.yml' ]; then
		printf '%s' "$nexus_compose_base"
	else
		printf '%s' "$1"
	fi
}

# The file Compose bind-mounts from the working directory, with the service that
# mounts it.
#
# Compose decides whether to recreate a container by comparing its configuration.
# The contents of a bind-mounted file are not part of that comparison, so a
# changed Caddyfile survives docker compose up -d with the old bytes still loaded
# in the running container. The service has to be restarted by name.
#
# By hand, after a refresh that changed the file:
#   docker compose restart edge
nexus_mounted_files() {
	cat <<'MOUNTS'
Caddyfile edge
MOUNTS
}

# The volumes an upgrade copies, and the reason the rest are absent.
#
# postgres-data is not here because the dump supersedes it. A custom-format dump
# restores into the major version that wrote it or a newer one, a tarball of the
# data directory restores only into the major that wrote it, and taking both
# doubles the downtime and the disk for a strictly weaker artifact.
#
# valkey-data and nats-data hold queued work, not records. Losing them drops
# scheduled bulk deletions and background jobs, which is degradation rather than
# loss, and the upgrade never removes a volume, so nothing here can lose them.
#
# meilisearch-data rebuilds on the next API start, edge-data is one certificate
# request, edge-config is rewritten by Caddy on every start.
#
# seaweedfs-data is the one that matters. It holds every upload, avatar, report
# and harvest, and nothing else in the stack can recreate any of it.
nexus_backup_volumes() {
	cat <<'VOLUMES'
seaweedfs-data
VOLUMES
}

nexus_usage() {
	cat <<'USAGE'
Usage: sh install.sh --domain <host> [options]
       sh install.sh --update [options]
       sh install.sh --rollback [options]

Options:
  --domain <host>          Hostname the instance answers on. Prompted when absent.
  --email <address>        Contact email for web push. Default admin@<domain>.
  --engine <command>       Container engine to drive. Default docker, or podman
                           when docker is absent.
  --dir <path>             Working directory. Default ~/nexus, or the working
                           directory itself when --update or --rollback is given
                           and it holds an instance.
  --ref <git ref>          Ref the stack files come from. Default: the image tag,
                           and main when that tag is v1 or latest.
  --image-tag <tag>        Image tag the stack runs. Default v1.
  --tls bundled|proxy      Certificate mode. Default bundled.
  --edge-bind <addr:port>  Plain HTTP bind under --tls proxy. Default 127.0.0.1:8080.
  --non-interactive        Never prompt. A missing required value is an error.
  --dry-run                Print the plan. Change nothing.
  --no-start               Write everything and skip $nexus_engine compose up -d.
  --update                 Upgrade: record, back up, refresh, pull, recreate, verify.
  --rollback               Restore the images and stack files of the last record.
  --backup-dir <path>      Where records go. Default <dir>/backups.
  --no-volume-backup       Take the database dump and skip the uploads copy.
  --no-volume-compression  Copy the uploads as a plain .tar. Faster, larger.
  --skip-backup-accept-data-loss
                           Upgrade with no backup at all. Losable data is lost.
  --allow-root             Permit running as root.
  --help                   Print this text.
USAGE
}

nexus_say() {
	printf '%s\n' "$1"
}

nexus_say_first_run() {
	nexus_say 'Open it and enter this setup token to create the admin account:'
	nexus_say ''
	nexus_say "  $(nexus_env_scalar NEXUS_SETUP_TOKEN)"
	nexus_say ''
}

nexus_fail() {
	printf '%s\n' "$2" >&2
	exit "$1"
}

nexus_bad_usage() {
	printf '%s\n\n' "$1" >&2
	nexus_usage >&2
	exit 1
}

nexus_take_value() {
	if [ "$2" -lt 2 ]; then
		nexus_bad_usage "$1 needs a value."
	fi
	case $3 in
		''|--*) nexus_bad_usage "$1 needs a value." ;;
	esac
}

nexus_scratch=''
nexus_record=''

nexus_cleanup() {
	if [ -n "$nexus_scratch" ] && [ -d "$nexus_scratch" ]; then
		rm -rf "$nexus_scratch"
	fi
}

nexus_on_signal() {
	nexus_cleanup
	if [ -n "$nexus_record" ] && [ -d "$nexus_record" ]; then
		printf 'Interrupted. The backup and the version record are in %s.\n' "$nexus_record" >&2
	else
		printf 'Interrupted. The stack files and .env are left as they were.\n' >&2
	fi
	exit 130
}

trap nexus_cleanup EXIT
trap nexus_on_signal INT
trap nexus_on_signal HUP
trap nexus_on_signal TERM

opt_domain=''
opt_email=''
opt_dir=''
opt_engine=''
nexus_engine='docker'
nexus_engine_label='Docker Engine'
opt_ref=''
opt_image_tag='v1'
opt_tls='bundled'
opt_edge_bind='127.0.0.1:8080'
opt_non_interactive=0
opt_dry_run=0
opt_no_start=0
opt_update=0
opt_rollback=0
opt_backup_dir=''
opt_no_volume_backup=0
opt_no_volume_compression=0
opt_skip_backup=0
opt_allow_root=0

nexus_self=''
if [ -f "$0" ]; then
	case $0 in
		/*) nexus_self=$0 ;;
		*) nexus_self="$(pwd)/$0" ;;
	esac
fi
nexus_self_args=''
for nexus_arg in "$@"; do
	nexus_self_args="$nexus_self_args '$(printf '%s' "$nexus_arg" | sed "s/'/'\\\\''/g")'"
done

while [ $# -gt 0 ]; do
	case $1 in
		--domain)
			nexus_take_value '--domain' $# "${2:-}"
			opt_domain=$2
			shift 2
			;;
		--email)
			nexus_take_value '--email' $# "${2:-}"
			opt_email=$2
			shift 2
			;;
		--engine)
			nexus_take_value '--engine' $# "${2:-}"
			opt_engine=$2
			shift 2
			;;
		--dir)
			nexus_take_value '--dir' $# "${2:-}"
			opt_dir=$2
			shift 2
			;;
		--ref)
			nexus_take_value '--ref' $# "${2:-}"
			opt_ref=$2
			shift 2
			;;
		--image-tag)
			nexus_take_value '--image-tag' $# "${2:-}"
			opt_image_tag=$2
			shift 2
			;;
		--tls)
			nexus_take_value '--tls' $# "${2:-}"
			opt_tls=$2
			shift 2
			;;
		--edge-bind)
			nexus_take_value '--edge-bind' $# "${2:-}"
			opt_edge_bind=$2
			shift 2
			;;
		--backup-dir)
			nexus_take_value '--backup-dir' $# "${2:-}"
			opt_backup_dir=$2
			shift 2
			;;
		--non-interactive)
			opt_non_interactive=1
			shift
			;;
		--dry-run)
			opt_dry_run=1
			shift
			;;
		--no-start)
			opt_no_start=1
			shift
			;;
		--update)
			opt_update=1
			shift
			;;
		--rollback)
			opt_rollback=1
			shift
			;;
		--no-volume-backup)
			opt_no_volume_backup=1
			shift
			;;
		--no-volume-compression)
			opt_no_volume_compression=1
			shift
			;;
		--skip-backup-accept-data-loss)
			opt_skip_backup=1
			shift
			;;
		--allow-root)
			opt_allow_root=1
			shift
			;;
		--help)
			nexus_usage
			exit 0
			;;
		*)
			nexus_bad_usage "Unknown option $1."
			;;
	esac
done

# An upgrade acts on an instance that already exists, and the directory holding
# one is recognisable: a compose file with content, an .env beside it, and at
# least one NEXUS_ key in that .env. Taking the working directory when it holds
# those is what an operator standing in their own instance means, and it is the
# only case where the default is not ~/nexus.
#
# The NEXUS_ test is what keeps this off somebody else's stack. A compose file
# and an .env together describe every Compose project there is, and an upgrade
# replaces the stack files in the directory it acts on, so a looser test would
# overwrite a project that has nothing to do with Nexus.
#
# An install writes a new instance, so it never adopts the working directory.
if [ -z "$opt_dir" ]; then
	nexus_here_compose=$(nexus_compose_name_in "$(pwd)" || true)
	if { [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; } &&
		[ -n "$nexus_here_compose" ] && [ -s "$(pwd)/$nexus_here_compose" ] &&
		[ -e "$(pwd)/.env" ] && grep -q '^NEXUS_' "$(pwd)/.env" 2>/dev/null; then
		opt_dir="$(pwd)"
		nexus_say "Acting on the instance in $opt_dir, the working directory. Pass --dir to name another."
	else
		if [ -n "${HOME:-}" ]; then
			opt_dir="$HOME/nexus"
		else
			opt_dir="$(pwd)/nexus"
		fi
		if [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; then
			nexus_say "The working directory holds no instance, so this acts on $opt_dir. Pass --dir to name another."
		fi
	fi
fi
case $opt_dir in
	/*) ;;
	*) opt_dir="$(pwd)/$opt_dir" ;;
esac

if [ -z "$opt_backup_dir" ]; then
	opt_backup_dir="$opt_dir/backups"
fi
case $opt_backup_dir in
	/*) ;;
	*) opt_backup_dir="$(pwd)/$opt_backup_dir" ;;
esac

nexus_docker_hint() {
	if [ "$(uname -s)" = 'Darwin' ]; then
		printf '%s' 'Install Docker Desktop from https://docs.docker.com/desktop/setup/install/mac-install/.'
		return 0
	fi
	if command -v apt-get >/dev/null 2>&1; then
		printf '%s' 'On Debian and Ubuntu, follow https://docs.docker.com/engine/install/ and install docker-ce with docker-compose-plugin. The distribution docker.io package ships no Compose plugin.'
		return 0
	fi
	if grep -qE '^ID="?fedora"?$' /etc/os-release 2>/dev/null; then
		printf '%s' 'On Fedora, install Podman and Docker Compose with dnf install -y podman docker-compose, then start the Podman API socket with systemctl --user enable --now podman.socket. podman compose runs docker-compose ahead of podman-compose, which lacks commands this script runs.'
		return 0
	fi
	if command -v dnf >/dev/null 2>&1; then
		printf '%s' 'On RHEL and derivatives, follow https://docs.docker.com/engine/install/ and install docker-ce with docker-compose-plugin.'
		return 0
	fi
	if command -v zypper >/dev/null 2>&1; then
		printf '%s' 'On openSUSE, install the docker and docker-compose packages with zypper, then enable the docker service.'
		return 0
	fi
	if command -v pacman >/dev/null 2>&1; then
		printf '%s' 'On Arch Linux, install the docker and docker-compose packages with pacman, then enable the docker service.'
		return 0
	fi
	if command -v apk >/dev/null 2>&1; then
		printf '%s' 'On Alpine Linux, install the docker and docker-cli-compose packages with apk, then enable the docker service.'
		return 0
	fi
	printf '%s' 'Follow https://docs.docker.com/engine/install/ for this distribution.'
}

nexus_host_tool_hint() {
	if [ "$(uname -s)" = 'Darwin' ]; then
		printf '%s' "Install $1 with Homebrew."
		return 0
	fi
	if command -v apt-get >/dev/null 2>&1; then
		printf '%s' "Install it with apt-get install -y $1."
		return 0
	fi
	if command -v dnf >/dev/null 2>&1; then
		printf '%s' "Install it with dnf install -y $1."
		return 0
	fi
	if command -v zypper >/dev/null 2>&1; then
		printf '%s' "Install it with zypper install -y $1."
		return 0
	fi
	if command -v pacman >/dev/null 2>&1; then
		printf '%s' "Install it with pacman -S $1."
		return 0
	fi
	if command -v apk >/dev/null 2>&1; then
		printf '%s' "Install it with apk add $1."
		return 0
	fi
	printf '%s' "Install $1 with the package manager of this distribution."
}

nexus_version_field() {
	printf '%s' "$1" | cut -d. -f"$2"
}

nexus_version_ge() {
	nexus_vg_index=1
	while [ "$nexus_vg_index" -le 3 ]; do
		nexus_vg_left=$(nexus_version_field "$1" "$nexus_vg_index")
		nexus_vg_right=$(nexus_version_field "$2" "$nexus_vg_index")
		case $nexus_vg_left in
			''|*[!0-9]*) nexus_vg_left=0 ;;
		esac
		case $nexus_vg_right in
			''|*[!0-9]*) nexus_vg_right=0 ;;
		esac
		if [ "$nexus_vg_left" -gt "$nexus_vg_right" ]; then
			return 0
		fi
		if [ "$nexus_vg_left" -lt "$nexus_vg_right" ]; then
			return 1
		fi
		nexus_vg_index=$((nexus_vg_index + 1))
	done
	return 0
}

nexus_engine_version=''
nexus_compose_version=''

# Every engine that speaks the Docker CLI reports itself as "<name> version X".
# Docker says "Docker version 28.0.0, build ...", Podman says "podman version
# 5.8.4", and the podman-docker shim answers as Podman under the name docker.
# Reading the name as well as the number is what lets the floor below belong to
# the engine actually in use, because Podman's 5.x is not Docker's 5.x.
nexus_resolve_engine() {
	if [ -n "$opt_engine" ]; then
		nexus_engine=$opt_engine
	elif command -v docker >/dev/null 2>&1; then
		nexus_engine='docker'
	elif command -v podman >/dev/null 2>&1; then
		nexus_engine='podman'
	else
		nexus_fail 2 "Neither docker nor podman is installed. $(nexus_docker_hint)"
	fi
	if ! command -v "$nexus_engine" >/dev/null 2>&1; then
		nexus_fail 2 "$nexus_engine is not installed. Pass --engine with the command that drives your containers."
	fi
}

nexus_preflight() {
	if [ "$opt_allow_root" -eq 0 ] && [ "$(id -u)" -eq 0 ]; then
		nexus_fail 2 'Running as root. Use an account in the docker group, or pass --allow-root.'
	fi
	nexus_resolve_engine
	if ! $nexus_engine compose version >/dev/null 2>&1; then
		nexus_fail 2 "$nexus_engine has no compose subcommand. $(nexus_docker_hint)"
	fi
	if $nexus_engine compose version 2>/dev/null | grep -q '^podman-compose version'; then
		nexus_fail 2 "$nexus_engine compose runs podman-compose, which lacks compose ps -a and compose config --images that this script runs. $(nexus_docker_hint)"
	fi
	nexus_engine_report=$($nexus_engine --version 2>/dev/null)
	nexus_engine_kind=$(printf '%s\n' "$nexus_engine_report" | sed -n 's/^\([A-Za-z][A-Za-z]*\) version .*/\1/p' | tr 'A-Z' 'a-z')
	nexus_engine_version=$(printf '%s\n' "$nexus_engine_report" | sed -n 's/^[A-Za-z][A-Za-z]* version v\{0,1\}\([0-9][0-9.]*\).*/\1/p')
	nexus_compose_version=$($nexus_engine compose version --short 2>/dev/null | sed -n 's/^v\{0,1\}\([0-9][0-9.]*\).*/\1/p')
	if [ -z "$nexus_engine_version" ] || [ -z "$nexus_compose_version" ]; then
		nexus_fail 2 "Cannot read the engine and Compose versions from $nexus_engine. It answered \"$nexus_engine_report\" to --version."
	fi
	case $nexus_engine_kind in
		podman)
			nexus_engine_label='Podman'
			nexus_min_engine=$NEXUS_MIN_PODMAN
			;;
		*)
			nexus_engine_label='Docker Engine'
			nexus_min_engine=$NEXUS_MIN_ENGINE
			;;
	esac
	if ! nexus_version_ge "$nexus_engine_version" "$nexus_min_engine"; then
		nexus_fail 2 "$nexus_engine_label $nexus_engine_version with Compose $nexus_compose_version. Nexus needs $nexus_engine_label $nexus_min_engine or newer."
	fi
	if ! nexus_version_ge "$nexus_compose_version" "$NEXUS_MIN_COMPOSE"; then
		nexus_fail 2 "$nexus_engine_label $nexus_engine_version with Compose $nexus_compose_version. Nexus needs Compose $NEXUS_MIN_COMPOSE or newer."
	fi
	if ! $nexus_engine info >/dev/null 2>&1; then
		nexus_fail 2 "$nexus_engine does not answer. Start it and run this again."
	fi
	if ! command -v curl >/dev/null 2>&1; then
		nexus_fail 2 "curl is not installed. $(nexus_host_tool_hint curl)"
	fi
	if ! command -v openssl >/dev/null 2>&1; then
		nexus_fail 2 "openssl is not installed. $(nexus_host_tool_hint openssl)"
	fi
	nexus_say "$nexus_engine_label $nexus_engine_version with Compose $nexus_compose_version."
}

nexus_valid_domain() {
	case $1 in
		''|*[!a-z0-9.-]*) return 1 ;;
		.*|-*|*.|*-) return 1 ;;
		*..*) return 1 ;;
	esac
	case $1 in
		*.*) return 0 ;;
	esac
	return 1
}

nexus_valid_email() {
	case $1 in
		*@*@*) return 1 ;;
		@*|*@) return 1 ;;
		*' '*) return 1 ;;
		*@*) return 0 ;;
	esac
	return 1
}

nexus_valid_edge_bind() {
	case $1 in
		*:*) ;;
		*) return 1 ;;
	esac
	nexus_bind_port=${1##*:}
	nexus_bind_host=${1%:*}
	case $nexus_bind_port in
		''|*[!0-9]*) return 1 ;;
	esac
	case $nexus_bind_host in
		''|*' '*) return 1 ;;
	esac
	return 0
}

nexus_prompt() {
	nexus_prompt_label=$1
	nexus_prompt_tries=0
	nexus_prompt_value=''
	while [ "$nexus_prompt_tries" -lt 3 ]; do
		printf '%s: ' "$nexus_prompt_label" >&2
		if ! read -r nexus_prompt_value; then
			return 1
		fi
		if [ -n "$nexus_prompt_value" ]; then
			return 0
		fi
		nexus_prompt_tries=$((nexus_prompt_tries + 1))
	done
	return 1
}

nexus_sha256() {
	openssl dgst -sha256 < "$1" | awk '{print $NF}'
}

nexus_drop_scratch() {
	nexus_cleanup
	nexus_scratch=''
}

nexus_refresh_installer() {
	[ -z "${NEXUS_INSTALLER_REFRESHED:-}" ] || return 0
	[ -n "$nexus_self" ] || return 0
	nexus_self_dir=$(dirname "$nexus_self")
	if [ "$opt_dry_run" -eq 1 ]; then
		nexus_open_scratch "${TMPDIR:-/tmp}"
	elif [ -w "$nexus_self_dir" ]; then
		nexus_open_scratch "$nexus_self_dir"
	else
		nexus_say "$nexus_self_dir is not writable, so this run cannot check $nexus_self against $NEXUS_INSTALLER_URL and goes on with it."
		return 0
	fi
	if ! curl -fsSL --proto '=https' --tlsv1.2 -o "$nexus_scratch/install.sh.sha256" "$NEXUS_INSTALLER_URL.sha256"; then
		nexus_say "Could not reach $NEXUS_INSTALLER_URL.sha256, so this run goes on with $nexus_self."
		nexus_drop_scratch
		return 0
	fi
	nexus_published=$(awk 'NR == 1 {print $1}' "$nexus_scratch/install.sh.sha256")
	case $nexus_published in
		''|*[!0-9a-f]*) nexus_fail 4 "$NEXUS_INSTALLER_URL.sha256 holds no sha256 digest. Nothing was changed." ;;
	esac
	if [ "$(nexus_sha256 "$nexus_self")" = "$nexus_published" ]; then
		nexus_drop_scratch
		return 0
	fi
	if ! curl -fsSL --proto '=https' --tlsv1.2 -o "$nexus_scratch/install.sh" "$NEXUS_INSTALLER_URL"; then
		nexus_fail 4 "Download failed for $NEXUS_INSTALLER_URL. Nothing was changed."
	fi
	if [ "$(nexus_sha256 "$nexus_scratch/install.sh")" != "$nexus_published" ]; then
		nexus_fail 4 "$NEXUS_INSTALLER_URL does not match the digest in $NEXUS_INSTALLER_URL.sha256. Nothing was changed."
	fi
	nexus_say "$nexus_self differs from the installer $NEXUS_INSTALLER_URL serves. The stack files an upgrade downloads can require .env keys that only the current installer writes."
	if [ "$opt_dry_run" -eq 1 ]; then
		nexus_say 'The run asks to replace it with the current installer before it changes anything. The plan below is the one this copy would follow.'
		nexus_drop_scratch
		return 0
	fi
	if [ "$opt_non_interactive" -eq 1 ] || [ ! -t 0 ]; then
		nexus_fail 3 "Nothing was changed. Download the current installer and run it:
  curl -fsSLO $NEXUS_INSTALLER_URL"
	fi
	printf 'Replace %s with the current installer and run that? [y/N] ' "$nexus_self" >&2
	nexus_answer=''
	read -r nexus_answer || true
	case $nexus_answer in
		y|Y|yes|Yes|YES) ;;
		*) nexus_fail 3 "Kept $nexus_self. Nothing was changed. Read the current installer at $NEXUS_INSTALLER_URL and run it once it is in place." ;;
	esac
	if [ -x "$nexus_self" ]; then
		chmod +x "$nexus_scratch/install.sh"
	fi
	mv "$nexus_scratch/install.sh" "$nexus_self"
	nexus_drop_scratch
	nexus_say "Replaced $nexus_self. Running it."
	NEXUS_INSTALLER_REFRESHED=1
	export NEXUS_INSTALLER_REFRESHED
	eval "exec sh \"\$nexus_self\" $nexus_self_args"
}

nexus_resolve_values() {
	if [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; then
		return 0
	fi
	if [ -z "$opt_domain" ]; then
		if [ "$opt_non_interactive" -eq 1 ] || [ "$opt_dry_run" -eq 1 ] || [ ! -t 0 ]; then
			nexus_bad_usage '--domain is required.'
		fi
		nexus_prompt 'Hostname the instance answers on' || nexus_fail 1 'No hostname given.'
		opt_domain=$nexus_prompt_value
	fi
	nexus_valid_domain "$opt_domain" || nexus_bad_usage "--domain $opt_domain is not a lowercase hostname. Give a bare hostname such as chat.example.com."
	if [ -n "$opt_email" ]; then
		nexus_valid_email "$opt_email" || nexus_bad_usage "--email $opt_email is not an address."
	fi
}

nexus_validate_options() {
	case $opt_tls in
		bundled|proxy) ;;
		*) nexus_bad_usage "--tls takes bundled or proxy, not $opt_tls." ;;
	esac
	case $opt_ref in
		*' '*|*/../*|../*|*/..) nexus_bad_usage "--ref $opt_ref is not a git ref." ;;
	esac
	case $opt_image_tag in
		''|*' '*|*/*) nexus_bad_usage "--image-tag $opt_image_tag is not an image tag." ;;
	esac
	if [ "$opt_tls" = 'proxy' ]; then
		nexus_valid_edge_bind "$opt_edge_bind" || nexus_bad_usage "--edge-bind $opt_edge_bind is not an address and port."
	fi
	if [ "$opt_update" -eq 1 ] && [ "$opt_rollback" -eq 1 ]; then
		nexus_bad_usage '--update and --rollback do not combine.'
	fi
	if [ "$opt_no_start" -eq 1 ] && { [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; }; then
		nexus_bad_usage '--no-start belongs to an install. An upgrade that does not recreate is not an upgrade.'
	fi
	if [ "$opt_skip_backup" -eq 1 ] && [ "$opt_update" -eq 0 ]; then
		nexus_bad_usage '--skip-backup-accept-data-loss belongs to --update.'
	fi
	if [ "$opt_no_volume_backup" -eq 1 ] && [ "$opt_update" -eq 0 ]; then
		nexus_bad_usage '--no-volume-backup belongs to --update.'
	fi
	if [ "$opt_skip_backup" -eq 1 ] && [ "$opt_no_volume_backup" -eq 1 ]; then
		nexus_bad_usage '--skip-backup-accept-data-loss already skips the volume copy.'
	fi
	if [ "$opt_no_volume_compression" -eq 1 ] && [ "$opt_update" -eq 0 ]; then
		nexus_bad_usage '--no-volume-compression belongs to --update.'
	fi
	if [ "$opt_no_volume_compression" -eq 1 ] && { [ "$opt_skip_backup" -eq 1 ] || [ "$opt_no_volume_backup" -eq 1 ]; }; then
		nexus_bad_usage '--no-volume-compression changes the volume copy, which this run skips.'
	fi
}

nexus_ref_for_tag() {
	case $1 in
		v1|latest) printf 'main' ;;
		*) printf '%s' "$1" ;;
	esac
}

# The images come from NEXUS_IMAGE_TAG and the stack files come from a git ref.
# A release tags its images and its commit with the same CalVer string, so a
# pinned tag names the commit that holds its compose files. The moving tags v1
# and latest map to main, which can run ahead of the v1 images.
nexus_resolve_ref() {
	[ -z "$opt_ref" ] || return 0
	if [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; then
		opt_ref=$(nexus_ref_for_tag "$(nexus_env_value NEXUS_IMAGE_TAG)")
	else
		opt_ref=$(nexus_ref_for_tag "$opt_image_tag")
	fi
	if [ -z "$opt_ref" ]; then
		nexus_fail 3 "$opt_dir/.env declares no NEXUS_IMAGE_TAG, so no ref can be derived. Pass --ref."
	fi
	case $opt_ref in
		*' '*|*/../*|../*|*/..) nexus_fail 3 "NEXUS_IMAGE_TAG is $opt_ref, which is not a git ref. Pass --ref." ;;
	esac
}

nexus_print_plan() {
	nexus_say 'Plan:'
	nexus_say "  directory     $opt_dir"
	nexus_say "  ref           $opt_ref"
	nexus_say "  image tag     $opt_image_tag"
	nexus_say "  tls           $opt_tls"
	if [ "$opt_tls" = 'proxy' ]; then
		nexus_say "  edge bind     $opt_edge_bind"
	fi
	nexus_say "  domain        $opt_domain"
	nexus_plan_non_secret=$(nexus_non_secret_keys | wc -l | tr -d ' ')
	if [ -n "$opt_email" ]; then
		nexus_say "  email         $opt_email"
	else
		nexus_say "  email         admin@$opt_domain, derived by compose"
		nexus_plan_non_secret=$((nexus_plan_non_secret - 1))
	fi
	nexus_say '  action        download the stack files, write .env, start the stack'
	nexus_say "  .env keys     $nexus_plan_non_secret non-secret values and $(nexus_secret_keys | wc -l | tr -d ' ') secrets"
	nexus_say '  files         docker-compose.yml docker-compose.proxy.yml tunnel.compose.yml Caddyfile .env.example'
	if [ -e "$opt_dir/.env" ]; then
		nexus_say "  note          $opt_dir/.env exists. A run without --update refuses it."
	fi
	nexus_say 'Nothing is written. Drop --dry-run to run this.'
}

# The scratch directory sits beside the files it will become, so the rename that
# puts a downloaded file in place is a rename within one filesystem and cannot
# leave a half-written file behind. The dry run passes a temporary parent
# instead, because it renames nothing.
nexus_open_scratch() {
	mkdir -p "$1"
	nexus_scratch="$1/.nexus-install.$$"
	rm -rf "$nexus_scratch"
	mkdir -m 700 "$nexus_scratch"
}

# By hand, for one file:
#   curl -fsSL https://raw.githubusercontent.com/nexusapp/nexus/main/deploy/self-hosting/docker-compose.yml -o docker-compose.yml
#
# The files come from a git ref and the images come from NEXUS_IMAGE_TAG. The
# ref is derived from the tag unless --ref names one. A pinned CalVer tag names
# the commit its images were built from, so its compose file asks only for
# variables those images read and pins only images the release built. The moving
# tags v1 and latest map to main, and main's compose file can run ahead of the v1
# images until the image builds are dispatched again.
nexus_fetch_stack() {
	nexus_say "Downloading the stack files from ref $opt_ref."
	nexus_stack_files > "$nexus_scratch/files"
	while read -r nexus_file; do
		[ -n "$nexus_file" ] || continue
		nexus_part="$nexus_scratch/$nexus_file.part"
		if ! curl -fsSL --proto '=https' --tlsv1.2 -o "$nexus_part" "$NEXUS_RAW_BASE/$opt_ref/$NEXUS_STACK_PATH/$nexus_file"; then
			nexus_fail 4 "Download failed for $nexus_file at ref $opt_ref. Pass --ref to name the ref the stack files come from."
		fi
		if [ ! -s "$nexus_part" ]; then
			nexus_fail 4 "Downloaded $nexus_file is empty."
		fi
		if [ "$nexus_file" = 'docker-compose.yml' ] && ! grep -q '^services:' "$nexus_part"; then
			nexus_fail 4 "The docker-compose.yml downloaded from $opt_ref holds no services block."
		fi
	done < "$nexus_scratch/files"
}

# Every file lands only after all of them arrive, so a failed download leaves the
# directory on the set it already had.
#
# None of these files is part of an image, and all four are read from the working
# directory, so docker compose pull never updates any of them. That is why an
# upgrade refreshes them itself.
#
# A refreshed docker-compose.yml can declare a variable the running .env does not
# define. Compose writes ${NAME:?message} for a variable the stack requires and
# stops with that message until .env sets it, and ${NAME:-default} for one that
# needs nothing from the operator. Every optional override ships commented out in
# .env.example, so a new required key is the only kind that asks for an edit.
nexus_place_stack() {
	while read -r nexus_file; do
		[ -n "$nexus_file" ] || continue
		mv "$nexus_scratch/$nexus_file.part" "$opt_dir/$(nexus_placed_name "$nexus_file")"
	done < "$nexus_scratch/files"
	rm -f "$nexus_scratch/all-services"
	nexus_say "Stack files in $opt_dir are at ref $opt_ref."
}

nexus_compose_project() {
	if [ -n "${COMPOSE_PROJECT_NAME:-}" ]; then
		printf '%s' "$COMPOSE_PROJECT_NAME"
		return 0
	fi
	sed -n 's/^name: *//p' "$opt_dir/$nexus_compose_base" | head -n 1
}

nexus_project=''

nexus_set_project() {
	nexus_project=$(nexus_compose_project)
	if [ -z "$nexus_project" ]; then
		nexus_fail 2 "$nexus_compose_base in $opt_dir declares no project name, so the volume names cannot be derived."
	fi
}

# A second install reuses the volumes of the first, because the compose project
# name is fixed. Those volumes hold the old secrets, so the new .env never opens
# them and the stack starts into an authentication loop.
nexus_check_volumes() {
	nexus_project=$(nexus_compose_project)
	if [ -z "$nexus_project" ]; then
		return 0
	fi
	$nexus_engine volume ls -q --filter "label=com.docker.compose.project=$nexus_project" > "$nexus_scratch/volumes" 2>/dev/null || return 0
	if [ -s "$nexus_scratch/volumes" ]; then
		nexus_fail 3 "Docker already holds volumes for the $nexus_project project. They hold the secrets of an earlier install, and this .env does not open them. Run install.sh --update in the directory that holds that instance, or remove the volumes with $nexus_engine volume rm before you install again."
	fi
}

nexus_base64url() {
	openssl base64 -A | tr '+/' '-_' | tr -d '='
}

nexus_vapid_public=''
nexus_vapid_private=''

# The VAPID pair is the one secret in .env that no random draw produces.
# NEXUS_VAPID_PUBLIC_KEY is base64url of the 65-byte uncompressed P-256 point
# and NEXUS_VAPID_PRIVATE_KEY is base64url of its 32-byte scalar. The stack
# requires both even when nobody enables browser notifications.
#
# By hand:
#   openssl ecparam -name prime256v1 -genkey -noout -out vapid.pem
#   openssl ec -in vapid.pem -outform DER | od -An -tx1 -N7 | tr -d ' \n'
#   The line above must print 30770201010420. Any other value means a short
#   scalar, so delete vapid.pem and draw again before going on.
#   openssl ec -in vapid.pem -outform DER | tail -c +8 | head -c 32 | openssl base64 -A | tr '+/' '-_' | tr -d '='
#   openssl ec -in vapid.pem -pubout -outform DER | tail -c 65 | openssl base64 -A | tr '+/' '-_' | tr -d '='
#
# The private key is 43 characters and the public key is 87.
#
# LibreSSL trims a leading zero byte off the SEC1 private key, which shifts the
# scalar and yields a well formed value that no push service accepts. The header
# check rejects that key and the loop draws another one.
nexus_generate_vapid() {
	nexus_vapid_try=1
	while [ "$nexus_vapid_try" -le "$NEXUS_VAPID_ATTEMPTS" ]; do
		openssl ecparam -name prime256v1 -genkey -noout -out "$nexus_scratch/vapid.pem" 2>/dev/null
		openssl ec -in "$nexus_scratch/vapid.pem" -outform DER -out "$nexus_scratch/vapid.der" 2>/dev/null
		openssl ec -in "$nexus_scratch/vapid.pem" -pubout -outform DER -out "$nexus_scratch/vapid.pub.der" 2>/dev/null
		nexus_vapid_header=$(od -An -tx1 -N7 < "$nexus_scratch/vapid.der" | tr -d ' \n')
		if [ "$nexus_vapid_header" = "$NEXUS_SEC1_HEADER" ]; then
			nexus_vapid_private=$(tail -c +8 "$nexus_scratch/vapid.der" | head -c 32 | nexus_base64url)
			nexus_vapid_public=$(tail -c 65 "$nexus_scratch/vapid.pub.der" | nexus_base64url)
			rm -f "$nexus_scratch/vapid.pem" "$nexus_scratch/vapid.der" "$nexus_scratch/vapid.pub.der"
			if [ ${#nexus_vapid_private} -eq 43 ] && [ ${#nexus_vapid_public} -eq 87 ]; then
				return 0
			fi
			return 1
		fi
		nexus_vapid_try=$((nexus_vapid_try + 1))
	done
	return 1
}

# The same file by hand, which is what this function does in one pass:
#
#   cp .env.example .env
#   chmod 600 .env
#
# Then set NEXUS_DOMAIN, the one value only the operator knows. NEXUS_VAPID_EMAIL
# is optional, and compose derives admin@NEXUS_DOMAIN while it is unset. The five
# other non-secret keys in the list above ship correct in .env.example and need no
# edit.
#
# Every secret in .env.example contains the literal CHANGE_ME, apart from
# NEXUS_SETUP_TOKEN, which sits there as a commented line. A key whose name
# ends in _BASE64 takes openssl rand -base64 32, every other key takes
# openssl rand -hex 32, and the VAPID pair comes from the generator above.
#
# Under --tls proxy, COMPOSE_FILE and NEXUS_EDGE_BIND already sit in
# .env.example as commented lines, so by hand they are uncommented rather than
# added.
nexus_write_env() {
	nexus_env_tmp="$nexus_scratch/env"
	nexus_old_umask=$(umask)
	umask 077
	: > "$nexus_env_tmp"
	nexus_non_secret_keys > "$nexus_scratch/non-secret-keys"
	while read -r nexus_key nexus_kind nexus_literal; do
		[ -n "$nexus_key" ] || continue
		case $nexus_kind in
			domain) nexus_value=$opt_domain ;;
			email)
				[ -n "$opt_email" ] || continue
				nexus_value=$opt_email
				;;
			image_tag) nexus_value=$opt_image_tag ;;
			literal) nexus_value=$nexus_literal ;;
			*) nexus_fail 5 "Unknown non-secret kind $nexus_kind for $nexus_key." ;;
		esac
		printf '%s=%s\n' "$nexus_key" "$nexus_value" >> "$nexus_env_tmp"
	done < "$nexus_scratch/non-secret-keys"
	if [ "$opt_tls" = 'proxy' ]; then
		printf 'COMPOSE_FILE=%s\n' 'docker-compose.yml:docker-compose.proxy.yml' >> "$nexus_env_tmp"
		printf 'NEXUS_EDGE_BIND=%s\n' "$opt_edge_bind" >> "$nexus_env_tmp"
	fi
	nexus_secret_keys > "$nexus_scratch/secret-keys"
	while read -r nexus_key nexus_kind; do
		[ -n "$nexus_key" ] || continue
		case $nexus_kind in
			hex) nexus_value=$(openssl rand -hex 32) ;;
			base64) nexus_value=$(openssl rand -base64 32) ;;
			vapid_public) nexus_value=$nexus_vapid_public ;;
			vapid_private) nexus_value=$nexus_vapid_private ;;
			*) nexus_fail 5 "Unknown secret kind $nexus_kind for $nexus_key." ;;
		esac
		if [ -z "$nexus_value" ]; then
			nexus_fail 5 "Generated an empty value for $nexus_key."
		fi
		printf '%s=%s\n' "$nexus_key" "$nexus_value" >> "$nexus_env_tmp"
	done < "$nexus_scratch/secret-keys"
	mv "$nexus_env_tmp" "$opt_dir/.env"
	chmod 600 "$opt_dir/.env"
	umask "$nexus_old_umask"
}

nexus_stack_ready() {
	: > "$nexus_scratch/not-ready"
	$nexus_engine compose ps -aq > "$nexus_scratch/ids" 2>/dev/null || return 1
	[ -s "$nexus_scratch/ids" ] || return 1
	xargs $nexus_engine inspect --format "$NEXUS_INSPECT_FORMAT" < "$nexus_scratch/ids" > "$nexus_scratch/state" 2>/dev/null || return 1
	nexus_ready=1
	nexus_init_done=0
	nexus_ready_count=0
	nexus_service_count=0
	while read -r nexus_service nexus_status nexus_health nexus_code; do
		[ -n "$nexus_service" ] || continue
		nexus_stack_defines_service "$nexus_service" || continue
		nexus_service_count=$((nexus_service_count + 1))
		case $nexus_status in
			running)
				case $nexus_health in
					healthy|none) nexus_ready_count=$((nexus_ready_count + 1)) ;;
					*)
						printf '%s running (%s)\n' "$nexus_service" "$nexus_health" >> "$nexus_scratch/not-ready"
						nexus_ready=0
						;;
				esac
				;;
			exited)
				if [ "$nexus_service" = 'seaweedfs-init' ] && [ "$nexus_code" = '0' ]; then
					nexus_init_done=1
					nexus_ready_count=$((nexus_ready_count + 1))
				else
					printf '%s exited (%s)\n' "$nexus_service" "$nexus_code" >> "$nexus_scratch/not-ready"
					nexus_ready=0
				fi
				;;
			*)
				printf '%s %s\n' "$nexus_service" "$nexus_status" >> "$nexus_scratch/not-ready"
				nexus_ready=0
				;;
		esac
	done < "$nexus_scratch/state"
	if [ "$nexus_ready" -eq 0 ]; then
		return 1
	fi
	if [ "$nexus_init_done" -eq 1 ]; then
		return 0
	fi
	if nexus_stack_defines_service 'seaweedfs-init'; then
		printf 'seaweedfs-init has not completed\n' >> "$nexus_scratch/not-ready"
		nexus_service_count=$((nexus_service_count + 1))
		return 1
	fi
	return 0
}

nexus_not_ready_detail() {
	if [ -s "$nexus_scratch/not-ready" ]; then
		printf 'These services are not ready:\n%s' "$(sed 's/^/  /' "$nexus_scratch/not-ready")"
	else
		printf '%s' "$nexus_engine compose reports no container state for this project."
	fi
}

# Readiness comes from Compose state, which is local and authoritative.
#
# By hand:
#   docker compose ps
#
# Every service reads running or healthy except seaweedfs-init, which reads
# exited (0) because it is a one-shot bucket initialiser.
nexus_wait_ready() {
	nexus_waited=0
	nexus_reported=0
	nexus_ready_count=0
	nexus_service_count=0
	while [ "$nexus_waited" -lt "$NEXUS_READY_TIMEOUT" ]; do
		if nexus_stack_ready; then
			return 0
		fi
		sleep "$NEXUS_READY_INTERVAL"
		nexus_waited=$((nexus_waited + NEXUS_READY_INTERVAL))
		if [ "$((nexus_waited - nexus_reported))" -ge "$NEXUS_READY_REPORT" ]; then
			nexus_reported=$nexus_waited
			nexus_say "$nexus_ready_count of $nexus_service_count services are ready."
		fi
	done
	return 1
}

nexus_env_value() {
	sed -n "s/^$1=\\(.*\\)\$/\\1/p" "$opt_dir/.env" | head -n 1
}

# The origin browsers use. .env states it outright when NEXUS_PUBLIC_ORIGIN is
# set, and Compose otherwise builds the same string from the scheme, the domain
# and the port, dropping a port that is the default for its scheme.
#
# Compose expands a ${...} reference inside an .env value and this script does
# not, so a NEXUS_PUBLIC_ORIGIN written that way is skipped rather than printed
# back with the braces still in it. The three names below say the same address,
# so the derived string is the right one to fall back to.
#
# By hand:
#   grep -E '^NEXUS_(PUBLIC_ORIGIN|PUBLIC_SCHEME|DOMAIN|PUBLIC_PORT)=' .env
nexus_public_origin() {
	nexus_origin=$(nexus_env_value NEXUS_PUBLIC_ORIGIN)
	case $nexus_origin in
		*'${'*)
			printf '%s\n' 'NEXUS_PUBLIC_ORIGIN in .env holds a ${...} reference. This script does not expand those, so the address below comes from NEXUS_PUBLIC_SCHEME, NEXUS_DOMAIN and NEXUS_PUBLIC_PORT instead.' >&2
			nexus_origin=''
			;;
	esac
	if [ -n "$nexus_origin" ]; then
		printf '%s' "${nexus_origin%/}"
		return 0
	fi
	nexus_origin_host=$(nexus_env_value NEXUS_DOMAIN)
	if [ -z "$nexus_origin_host" ]; then
		return 0
	fi
	nexus_origin_scheme=$(nexus_env_value NEXUS_PUBLIC_SCHEME)
	if [ -z "$nexus_origin_scheme" ]; then
		nexus_origin_scheme='https'
	fi
	nexus_origin_port=$(nexus_env_value NEXUS_PUBLIC_PORT)
	if [ -z "$nexus_origin_port" ]; then
		nexus_origin_suffix=''
	else
		case $nexus_origin_scheme:$nexus_origin_port in
			http:80|https:443) nexus_origin_suffix='' ;;
			*) nexus_origin_suffix=":$nexus_origin_port" ;;
		esac
	fi
	printf '%s://%s%s' "$nexus_origin_scheme" "$nexus_origin_host" "$nexus_origin_suffix"
}

# The public probe is informational. A host behind hairpin NAT cannot always
# reach its own hostname, and a false failure there would be worse than no probe.
# It asks the origin .env advertises, so an instance on a non-default port is
# probed where it actually answers.
nexus_probe() {
	nexus_probe_origin=$1
	nexus_probe_authority=${nexus_probe_origin#*://}
	nexus_probe_host=${nexus_probe_authority%%:*}
	case $nexus_probe_origin in
		http://*) nexus_probe_port='80' ;;
		*) nexus_probe_port='443' ;;
	esac
	case $nexus_probe_authority in
		*:*) nexus_probe_port=${nexus_probe_authority##*:} ;;
	esac
	nexus_probe_code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$nexus_probe_origin/_health" 2>/dev/null || true)
	if [ -z "$nexus_probe_code" ]; then
		nexus_probe_code='000'
	fi
	if [ "$nexus_probe_code" = '200' ]; then
		nexus_say "$nexus_probe_origin/_health answers 200."
		return 0
	fi
	nexus_say "$nexus_probe_origin/_health answers $nexus_probe_code from this host. Check the DNS record for $nexus_probe_host and inbound port $nexus_probe_port."
}

# The keys a refreshed stack requires that an .env written by an older installer
# does not hold. Only keys with no state anywhere else are here. A value like
# POSTGRES_PASSWORD is matched by a password stored inside the database, so
# minting a new one locks the stack out of its own data and it is not listed.
#
# CHANGE_ME counts as absent. .env.example shipped the relay secret with that
# value for a while, and nothing read it until the API began refusing to start
# on a value under 32 bytes.
nexus_upgrade_secret_keys() {
	cat <<'KEYS'
NEXUS_ERLANG_COOKIE hex
NEXUS_MEDIA_PROXY_UPLOAD_RELAY_SECRET_BASE64 base64
NEXUS_PROFILE_PSEUDONYM_SECRET hex
KEYS
}

# One key written into .env, through a temporary file that replaces the whole
# file at once.
#
# Appending is not an option. A .env whose last line has no newline takes an
# appended line onto the end of that line instead, which reads as one key whose
# value ends in the name of the next, and destroys the secret that was there.
# awk ends every line it prints, so reading the file and writing it back gives
# the missing newline as a side effect.
#
# The replacement is a rename, so an interrupt leaves the old file whole rather
# than a truncated one, and this runs before the record exists.
nexus_env_set() {
	nexus_old_umask=$(umask)
	umask 077
	awk -v nexus_k="$1" -v nexus_v="$2" '
		index($0, nexus_k "=") == 1 && !nexus_done {print nexus_k "=" nexus_v; nexus_done = 1; next}
		{print}
		END {if (!nexus_done) print nexus_k "=" nexus_v}
	' "$opt_dir/.env" > "$nexus_scratch/env.set"
	if [ ! -s "$nexus_scratch/env.set" ]; then
		umask "$nexus_old_umask"
		nexus_fail 5 "Rewriting $1 into .env produced an empty file. Nothing was written."
	fi
	if ! grep -q "^$1=" "$nexus_scratch/env.set"; then
		umask "$nexus_old_umask"
		nexus_fail 5 "Rewriting $1 into .env did not write that key. Nothing was written."
	fi
	mv "$nexus_scratch/env.set" "$opt_dir/.env"
	chmod 600 "$opt_dir/.env"
	umask "$nexus_old_umask"
}

# Step 0 of an upgrade: mint the values the refreshed stack requires.
#
# Compose stops on a ${NAME:?} it cannot resolve, so a key the running .env does
# not hold fails every command this script runs before it reaches the step that
# would have reported it. Writing the value first is what makes the rest of the
# run possible, and a generated secret is as good as a hand-written one for
# every key listed above.
#
# This runs before the record, so the .env the record saves is the one that
# works and a rollback does not reintroduce the gap.
# The keys the run would write, one per line, without writing any of them. The
# plan and the run read the same list, so a plan cannot describe a run that does
# something else.
nexus_missing_required_secrets() {
	nexus_upgrade_secret_keys > "$nexus_scratch/upgrade-keys"
	while read -r nexus_key nexus_kind; do
		[ -n "$nexus_key" ] || continue
		nexus_current=$(nexus_env_value "$nexus_key")
		case ${nexus_current:-} in
			''|CHANGE_ME) printf '%s\n' "$nexus_key" ;;
		esac
	done < "$nexus_scratch/upgrade-keys"
}

nexus_fill_required_secrets() {
	nexus_upgrade_secret_keys > "$nexus_scratch/upgrade-keys"
	while read -r nexus_key nexus_kind; do
		[ -n "$nexus_key" ] || continue
		nexus_current=$(nexus_env_value "$nexus_key")
		case ${nexus_current:-} in
			''|CHANGE_ME) ;;
			*) continue ;;
		esac
		case $nexus_kind in
			hex) nexus_new=$(openssl rand -hex 32) ;;
			base64) nexus_new=$(openssl rand -base64 32) ;;
			*) nexus_fail 5 "Unknown secret kind $nexus_kind for $nexus_key." ;;
		esac
		[ -n "$nexus_new" ] || nexus_fail 5 "Generated an empty value for $nexus_key."
		nexus_env_set "$nexus_key" "$nexus_new"
		nexus_say "Wrote $nexus_key into .env. The refreshed stack requires it and this instance held no usable value."
	done < "$nexus_scratch/upgrade-keys"
}

nexus_require_instance() {
	if [ ! -e "$opt_dir/.env" ]; then
		nexus_fail 2 "No .env in $opt_dir. That directory holds no instance. Run install.sh with neither --update nor --rollback to set one up."
	fi
	nexus_resolve_compose_base
	if [ ! -e "$opt_dir/$nexus_compose_base" ]; then
		if [ -n "$nexus_compose_base_from" ]; then
			nexus_fail 2 "$nexus_compose_base_from names $nexus_compose_base first, and $opt_dir/$nexus_compose_base is not there. Put that file back, or name the file the instance runs on first in COMPOSE_FILE."
		fi
		nexus_fail 2 "No compose file in $opt_dir. Compose looks for compose.yaml, compose.yml, docker-compose.yml and docker-compose.yaml there, and that directory holds none of them, so it does not hold an instance."
	fi
	if [ ! -s "$opt_dir/$nexus_compose_base" ]; then
		nexus_fail 2 "$opt_dir/$nexus_compose_base is empty. A redirect that captured a failed download leaves that, and Compose refuses an empty compose file. Put the file back from a backup or from the record of the last upgrade, then run this again."
	fi
	if [ "$nexus_compose_base" != 'docker-compose.yml' ]; then
		nexus_say "Compose loads $nexus_compose_base in $opt_dir, so the stack's docker-compose.yml is written to that name."
	fi
}

# Compose reads COMPOSE_FILE from .env and loads every file it names before it
# answers anything, so one file the directory does not hold fails every docker
# compose command run in it. What Compose prints for that is a single stat line
# that names neither COMPOSE_FILE nor .env.
#
# Two of the files this script downloads sit in .env.example as a COMPOSE_FILE
# line to uncomment, so an instance set up before this script existed can hold
# the line and not the file. An upgrade reads the running images before it
# refreshes the stack files, so such an instance stops on the first step and no
# re-run gets any further.
#
# The line stays. Without the file it names the edge container binds 80 and 443
# and requests its own certificate.
#
# By hand:
#   grep COMPOSE_FILE .env
# A value as Compose reads it: no surrounding quotes, no carriage return from an
# editor that writes CRLF, no trailing blanks. Reading it any other way invents a
# filename the operator cannot see and refuses a run that would have worked.
nexus_env_scalar() {
	nexus_scalar=$(nexus_env_value "$1" | tr -d '\r')
	nexus_scalar=${nexus_scalar%"${nexus_scalar##*[! 	]}"}
	case $nexus_scalar in
		\"*\") nexus_scalar=${nexus_scalar#\"}; nexus_scalar=${nexus_scalar%\"} ;;
		"'"*"'") nexus_scalar=${nexus_scalar#"'"}; nexus_scalar=${nexus_scalar%"'"} ;;
	esac
	printf '%s' "$nexus_scalar"
}

nexus_compose_value() {
	eval "nexus_cv=\${$1:-}"
	if [ -z "$nexus_cv" ]; then
		nexus_cv=$(nexus_env_scalar "$1")
	fi
	printf '%s' "$nexus_cv"
}

nexus_read_compose_setting() {
	nexus_compose_file=${COMPOSE_FILE:-}
	nexus_compose_from="the environment"
	if [ -z "$nexus_compose_file" ]; then
		nexus_compose_file=$(nexus_env_scalar COMPOSE_FILE)
		nexus_compose_from="$opt_dir/.env"
	fi
	nexus_path_sep=${COMPOSE_PATH_SEPARATOR:-}
	if [ -z "$nexus_path_sep" ]; then
		nexus_path_sep=$(nexus_env_scalar COMPOSE_PATH_SEPARATOR)
	fi
	if [ -z "$nexus_path_sep" ]; then
		nexus_path_sep=':'
	fi
}

nexus_resolve_compose_base() {
	nexus_read_compose_setting
	nexus_compose_base_from=''
	nexus_rest=$nexus_compose_file
	while [ -n "$nexus_rest" ]; do
		nexus_name=${nexus_rest%%"$nexus_path_sep"*}
		case $nexus_rest in
			*"$nexus_path_sep"*) nexus_rest=${nexus_rest#*"$nexus_path_sep"} ;;
			*) nexus_rest='' ;;
		esac
		[ -n "$nexus_name" ] || continue
		nexus_compose_base=${nexus_name#./}
		nexus_compose_base=${nexus_compose_base#"$opt_dir"/}
		nexus_compose_base_from="COMPOSE_FILE from $nexus_compose_from"
		break
	done
	if [ -z "$nexus_compose_base_from" ]; then
		nexus_compose_base=$(nexus_compose_name_in "$opt_dir" || printf '%s' 'docker-compose.yml')
		return 0
	fi
	case $nexus_compose_base in
		*/*) nexus_fail 2 "$nexus_compose_base_from names $nexus_name first, and that file is not directly in $opt_dir. This script refreshes only the files in the directory it acts on, so the upgrade would leave the file Compose loads on the old stack. Move it into $opt_dir and name it there, or upgrade by hand." ;;
	esac
}

nexus_overlay_absence() {
	case $1 in
		external-object-store.compose.yml) printf '%s' 'Without it the bundled seaweedfs starts again and api, worker and media-proxy wait for it.' ;;
		*) printf '%s' "Without $1 the edge container binds 80 and 443 and requests its own certificate." ;;
	esac
}

nexus_require_compose_files() {
	nexus_read_compose_setting
	[ -n "$nexus_compose_file" ] || return 0
	nexus_compose_count=0
	nexus_rest=$nexus_compose_file
	while [ -n "$nexus_rest" ]; do
		case $nexus_rest in
			*"$nexus_path_sep"*)
				nexus_name=${nexus_rest%%"$nexus_path_sep"*}
				nexus_rest=${nexus_rest#*"$nexus_path_sep"}
				;;
			*)
				nexus_name=$nexus_rest
				nexus_rest=''
				;;
		esac
		[ -n "$nexus_name" ] || continue
		case $nexus_name in
			/*) nexus_path=$nexus_name ;;
			*) nexus_path="$opt_dir/$nexus_name" ;;
		esac
		nexus_compose_count=$((${nexus_compose_count:-0} + 1))
		[ ! -e "$nexus_path" ] || continue
		if nexus_stack_files | grep -qxF "$nexus_name"; then
			nexus_fail 2 "COMPOSE_FILE from $nexus_compose_from names $nexus_name and $nexus_path is not there, so every $nexus_engine compose command in $opt_dir fails and this run stops before it changes anything. This script downloads $nexus_name, and an instance set up before it existed does not hold that file yet. Put it in place and run this again:
  curl -fsSL --proto '=https' --tlsv1.2 -o $nexus_path $NEXUS_RAW_BASE/$opt_ref/$NEXUS_STACK_PATH/$nexus_name
Leave the COMPOSE_FILE line as it is. $(nexus_overlay_absence "$nexus_name")"
		fi
		nexus_fail 2 "COMPOSE_FILE from $nexus_compose_from names $nexus_name and $nexus_path is not there, so every $nexus_engine compose command in $opt_dir fails. This script does not download $nexus_name. Put that file back, or take it out of the COMPOSE_FILE line."
	done
	if [ "$nexus_compose_count" -gt 1 ] &&
		! nexus_version_ge "$nexus_compose_version" "$NEXUS_MIN_COMPOSE_OVERLAY"; then
		nexus_fail 2 "COMPOSE_FILE from $nexus_compose_from loads $nexus_compose_count files and this host runs Compose $nexus_compose_version. Every overlay this script downloads uses the !override or !reset tag, which needs Compose $NEXUS_MIN_COMPOSE_OVERLAY or newer. Upgrade Compose, or load only $nexus_compose_base."
	fi
}

# One read-only Compose query, with what Compose printed on stderr kept.
#
# Compose loads the whole file set and interpolates every variable in it before
# it answers either query below. A file that is not there, a file it cannot
# read and a required variable .env does not set all fail at that point, and the
# stderr text is the only thing that says which of them it was.
#
# The query writes to files rather than through a pipe, because the status of a
# pipeline is the status of its last command and the query is not the last
# command.
nexus_compose_query() {
	nexus_query_status=0
	$nexus_engine compose config "$1" > "$nexus_scratch/compose-out" 2> "$nexus_scratch/compose-err" || nexus_query_status=$?
	return "$nexus_query_status"
}

# What Compose printed on the last query, indented one level for the caller.
nexus_compose_error() {
	if [ -s "$nexus_scratch/compose-err" ]; then
		sed "s/^/$1/" "$nexus_scratch/compose-err"
	else
		printf '%snothing\n' "$1"
	fi
}

# The image references the stack resolves to, one per line, deduplicated. Compose
# expands them from docker-compose.yml and .env, so this is the same resolution
# docker compose pull performs. It names the images, not the versions of them.
#
# By hand:
#   docker compose config --images
nexus_compose_images() {
	nexus_compose_query --images || return 1
	sort -u "$nexus_scratch/compose-out"
}

# The image ID each container was actually created from, against the reference
# Compose created it under.
#
# docker image inspect <reference> answers a different question: what that tag
# points at on this host now. The two disagree whenever a newer image already
# sits under a moving tag, which is the state an upgrade that pulled and then
# failed leaves behind, and that is the state the operator re-runs --update from.
# Reading the tag there records the image the stack is about to move to as the
# image it is moving from, and the rollback that follows puts back what is
# already running while reporting success.
#
# By hand:
#   docker compose ps -aq | xargs docker inspect --format '{{.Config.Image}} {{.Image}}'
# The text of a captured stream, indented one level for the caller, or a word
# saying there was none. A command that fails without printing is rarer than one
# that prints the reason, and both read the same way here.
nexus_indent_file() {
	if [ -s "$1" ]; then
		sed "s/^/$2/" "$1"
	else
		printf '%snothing\n' "$2"
	fi
}

nexus_running_image_ids() {
	if ! $nexus_engine compose ps -aq > "$nexus_scratch/containers" 2> "$nexus_scratch/ps-err"; then
		nexus_fail 2 "$nexus_engine compose ps failed in $opt_dir, so what is running cannot be read and the record would name no image ID at all. Compose printed:
$(nexus_indent_file "$nexus_scratch/ps-err" '  ')"
	fi
	[ -s "$nexus_scratch/containers" ] || return 0
	if ! xargs $nexus_engine inspect --format '{{.Config.Image}} {{.Image}}' \
		< "$nexus_scratch/containers" > "$nexus_scratch/inspected" 2> "$nexus_scratch/inspect-err"; then
		nexus_fail 2 "$nexus_engine inspect failed in $opt_dir, so the image ID under each reference cannot be read and a rollback would have nothing to go back to. Docker printed:
$(nexus_indent_file "$nexus_scratch/inspect-err" '  ')"
	fi
	sort -u "$nexus_scratch/inspected"
}

# The recorded ID for one reference, or nothing when no container uses it.
nexus_recorded_id_for() {
	awk -v nexus_want="$1" '$1 == nexus_want {print $2; exit}' "$nexus_scratch/running"
}

# Step 1 of an upgrade: record what is running before anything moves.
#
# NEXUS_IMAGE_TAG defaults to v1, which tracks the latest compatible release.
# The tag therefore reads v1 before and after the upgrade, and the image ID is
# the only thing that tells two releases apart. That is what makes this record
# the version history the stack does not otherwise keep, and what makes a
# rollback possible on a moving tag.
#
# The reference list comes from Compose and the ID under each reference comes
# from the container running it, for the reason in nexus_running_image_ids. A
# reference no container uses is recorded as `-`, which a rollback skips,
# because a version that was not running is not a version to go back to.
#
# By hand:
#   docker compose images
nexus_record_state() {
	nexus_running_image_ids > "$nexus_scratch/running"
	if ! nexus_compose_images > "$nexus_scratch/refs"; then
		nexus_fail 2 "$nexus_engine compose config --images failed in $opt_dir, so the running version cannot be recorded. Compose printed:
$(nexus_compose_error '  ')"
	fi
	if [ ! -s "$nexus_scratch/refs" ]; then
		nexus_fail 2 "$nexus_engine compose config --images returned nothing in $opt_dir, so the running version cannot be recorded. The stack files there declare no service with an image."
	fi
	nexus_prepare_record
	printf '%s\n' "$(nexus_env_value NEXUS_IMAGE_TAG)" > "$nexus_record/$NEXUS_TAG_FILE"
	: > "$nexus_record/$NEXUS_IMAGES_FILE"
	while read -r nexus_ref; do
		[ -n "$nexus_ref" ] || continue
		nexus_id=$(nexus_recorded_id_for "$nexus_ref")
		if [ -z "$nexus_id" ]; then
			nexus_id='-'
		fi
		printf '%s %s\n' "$nexus_ref" "$nexus_id" >> "$nexus_record/$NEXUS_IMAGES_FILE"
	done < "$nexus_scratch/refs"
	nexus_say "Recorded $(wc -l < "$nexus_record/$NEXUS_IMAGES_FILE" | tr -d ' ') image references in $nexus_record."
}

# .env and the stack files go into the record because nothing else regenerates
# them. .env holds every secret the instance was built with, so the record
# directory is created 700 and the copy is 600, and the record belongs wherever
# the operator already keeps secrets.
nexus_save_current_files() {
	cp -p "$opt_dir/.env" "$nexus_record/.env"
	chmod 600 "$nexus_record/.env"
	while read -r nexus_file; do
		[ -n "$nexus_file" ] || continue
		nexus_placed="$opt_dir/$(nexus_placed_name "$nexus_file")"
		if [ -s "$nexus_placed" ]; then
			cp -p "$nexus_placed" "$nexus_record/$nexus_file"
		elif [ -e "$nexus_placed" ]; then
			nexus_fail 7 "$nexus_placed is empty, so the record would hold a file a rollback could not use. Put the file back before upgrading."
		fi
	done < "$nexus_scratch/files"
}

nexus_postgres_running() {
	nexus_pg_id=$($nexus_engine compose ps -q postgres 2>/dev/null | head -n 1)
	[ -n "$nexus_pg_id" ] || return 1
	[ "$($nexus_engine inspect --format '{{.State.Status}}' "$nexus_pg_id" 2>/dev/null)" = 'running' ]
}

# Step 2 of an upgrade, and the part that gates the rest.
#
# api, worker, users-shard and messages-shard apply schema changes while they
# start, and starting an older image does not undo them. The dump taken before
# the pull is the only way back across a schema change.
#
# By hand:
#   docker compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > backups/nexus.dump
#
# The postgres container's POSTGRES_USER and POSTGRES_DB follow
# NEXUS_POSTGRES_USERNAME and NEXUS_POSTGRES_DATABASE, so the command needs no
# names. Keep -T. Without it Docker attaches a terminal to the command and the
# dump arrives corrupted, which is why the first five bytes are checked against
# the custom-format magic below rather than only the size.
#
# The dump runs against the live stack. pg_dump reads inside one transaction, so
# it sees a consistent database without stopping anything. The volume copy below
# has no equivalent and is why the stack stops there and not here.
#
# The volume copy measures its volume and refuses when the disk is short. This
# step does not, because the size of a custom-format dump is not knowable before
# pg_dump writes it. Point --backup-dir at a filesystem with room for the
# database.
# The bundled data stores are services in the stack file. An operator who points
# the stack at a database or an object store outside it takes those services out,
# and the two backup steps that reach into them then have nothing to reach. That
# is a supported shape rather than a fault, so each step says what it skipped and
# the upgrade goes on. Backing up a store outside the stack belongs to whoever
# runs it.
nexus_stack_defines_service() {
	if [ ! -f "$nexus_scratch/all-services" ]; then
		if ! nexus_compose_services > "$nexus_scratch/all-services"; then
			rm -f "$nexus_scratch/all-services"
			nexus_fail 6 "docker compose config --services failed in $opt_dir, so the services this stack defines cannot be read. Compose printed:
$(nexus_compose_error '  ')"
		fi
	fi
	grep -qxF "$1" "$nexus_scratch/all-services"
}

# The bundled postgres container takes POSTGRES_USER and POSTGRES_DB from
# NEXUS_POSTGRES_USERNAME and NEXUS_POSTGRES_DATABASE, and the image applies
# them only to an empty data directory. When those names point the apps at a
# database outside the stack, the bundled directory still holds the role and
# database it was first started with, so a dump that reads the container env asks
# for a role that is not there. The bundled service is idle in that shape and the
# dump skips it.
#
# By hand:
#   grep -E '^NEXUS_POSTGRES_(HOST|URL)=' .env
nexus_postgres_external() {
	nexus_pg_host=$(nexus_compose_value NEXUS_POSTGRES_HOST)
	if [ -n "$nexus_pg_host" ] && [ "$nexus_pg_host" != postgres ]; then
		return 0
	fi
	nexus_pg_url=$(nexus_compose_value NEXUS_POSTGRES_URL)
	[ -n "$nexus_pg_url" ] || return 1
	nexus_pg_url_host=${nexus_pg_url#*://}
	nexus_pg_url_host=${nexus_pg_url_host%%[/?]*}
	nexus_pg_url_host=${nexus_pg_url_host##*@}
	nexus_pg_url_host=${nexus_pg_url_host%%:*}
	[ "$nexus_pg_url_host" != postgres ]
}

nexus_dump_postgres() {
	if ! nexus_stack_defines_service postgres; then
		nexus_say 'Skipping the database dump. This stack defines no postgres service, so its database runs outside the stack and only the operator of that database can dump it.'
		return 0
	fi
	if nexus_postgres_external; then
		nexus_say 'Skipping the database dump. NEXUS_POSTGRES_HOST or NEXUS_POSTGRES_URL points the stack at a database outside it, so the bundled postgres service is idle and only the operator of that database can dump it.'
		return 0
	fi
	if ! nexus_postgres_running; then
		nexus_say 'Postgres is not running. Starting it for the dump.'
		if ! $nexus_engine compose up -d --wait postgres; then
			nexus_fail 7 "Postgres does not start in $opt_dir, so no dump can be taken."
		fi
	fi
	nexus_dump_path="$nexus_record/$NEXUS_DUMP_FILE"
	nexus_say 'Dumping the database.'
	if ! $nexus_engine compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$nexus_dump_path"; then
		rm -f "$nexus_dump_path"
		nexus_fail 7 'pg_dump failed. The instance is untouched.'
	fi
	if [ "$(head -c 5 "$nexus_dump_path")" != 'PGDMP' ]; then
		rm -f "$nexus_dump_path"
		nexus_fail 7 'The dump does not begin with the custom-format header. The instance is untouched.'
	fi
	nexus_say "Dumped the database to $nexus_dump_path."
}

# What the sizing container printed, indented one level for the caller.
nexus_volume_error() {
	if [ -s "$nexus_scratch/volume-err" ]; then
		sed "s/^/$1/" "$nexus_scratch/volume-err"
	else
		printf '%snothing\n' "$1"
	fi
}

nexus_volume_size_kb() {
	$nexus_engine run --rm -v "$1:/data:ro" "$NEXUS_HELPER_IMAGE" du -sk /data 2> "$nexus_scratch/volume-err" |
		awk 'NR==1 {print $1}'
}

nexus_free_kb() {
	df -Pk "$1" 2>/dev/null | awk 'NR==2 {print $4}'
}

# Step 2 continued: the volume copy.
#
# A live copy can catch a file mid-write, so the stack stops for it. The stack
# comes back up on the images it was already running before anything else
# happens, so a failure here leaves a working instance rather than a stopped one.
#
# By hand:
#   docker compose stop
#   docker run --rm -v nexus_seaweedfs-data:/data -v "$PWD/backups:/backup" alpine tar czf /backup/seaweedfs-data.tgz -C /data .
#   docker compose up -d
nexus_copy_volumes() {
	if ! nexus_stack_defines_service seaweedfs; then
		nexus_say 'Skipping the uploads copy. This stack defines no seaweedfs service, so its objects are outside the stack and only the operator of that store can copy them.'
		return 0
	fi
	nexus_backup_volumes > "$nexus_scratch/backup-volumes"
	: > "$nexus_scratch/copy-volumes"
	nexus_copy_any=0
	while read -r nexus_volume; do
		[ -n "$nexus_volume" ] || continue
		nexus_full="${nexus_project}_${nexus_volume}"
		if ! $nexus_engine volume inspect "$nexus_full" >/dev/null 2>&1; then
			nexus_fail 7 "The volume $nexus_full does not exist, so the uploads cannot be copied. The stack declares that volume, so this is a project name other than $nexus_project or a volume that was removed. Pass --no-volume-backup to take the database dump alone when the uploads of this instance live somewhere this script cannot reach."
		fi
		nexus_size=$(nexus_volume_size_kb "$nexus_full")
		case ${nexus_size:-} in
			''|*[!0-9]*)
				nexus_fail 7 "Cannot measure the volume $nexus_full, so the uploads copy cannot be sized. Pass --no-volume-backup to take the database dump alone. Docker printed:
$(nexus_volume_error '  ')" ;;
		esac
		nexus_free=$(nexus_free_kb "$nexus_record")
		case ${nexus_free:-} in
			''|*[!0-9]*) nexus_fail 7 "Cannot read the free space on $nexus_record." ;;
		esac
		nexus_need=$((nexus_size * NEXUS_VOLUME_HEADROOM / 100))
		if [ "$nexus_free" -lt "$nexus_need" ]; then
			nexus_fail 7 "$nexus_full holds $((nexus_size / 1024)) MB and $nexus_record has $((nexus_free / 1024)) MB free. Point --backup-dir at a filesystem with room, or pass --no-volume-backup to take the database dump alone."
		fi
		printf '%s\n' "$nexus_volume" >> "$nexus_scratch/copy-volumes"
		nexus_copy_any=1
	done < "$nexus_scratch/backup-volumes"
	if [ "$nexus_copy_any" -eq 0 ]; then
		return 0
	fi
	if [ "$opt_no_volume_compression" -eq 1 ]; then
		nexus_tar_flags='cf'
		nexus_tar_ext='tar'
	else
		nexus_tar_flags='czf'
		nexus_tar_ext='tgz'
	fi
	nexus_say 'Stopping the stack for a consistent copy of the uploads.'
	if ! $nexus_engine compose stop; then
		nexus_fail 7 "$nexus_engine compose stop failed in $opt_dir."
	fi
	while read -r nexus_volume; do
		[ -n "$nexus_volume" ] || continue
		nexus_full="${nexus_project}_${nexus_volume}"
		nexus_say "Copying $nexus_full."
		if ! $nexus_engine run --rm -v "$nexus_full:/data:ro" -v "$nexus_record:/backup" "$NEXUS_HELPER_IMAGE" tar "$nexus_tar_flags" "/backup/$nexus_volume.$nexus_tar_ext" -C /data .; then
			$nexus_engine compose up -d --remove-orphans || true
			nexus_fail 7 "Copying $nexus_full failed. The stack is started again on the images it was running."
		fi
	done < "$nexus_scratch/copy-volumes"
	nexus_say 'Starting the stack again before the upgrade continues.'
	if ! $nexus_engine compose up -d --remove-orphans; then
		nexus_fail 7 "$nexus_engine compose up -d failed in $opt_dir after the copy. Read $nexus_engine compose logs there."
	fi
}

nexus_backup() {
	if [ "$opt_skip_backup" -eq 1 ]; then
		nexus_say 'Skipping the backup. --skip-backup-accept-data-loss was given, so a schema change has no way back.'
		return 0
	fi
	nexus_dump_postgres
	if [ "$opt_no_volume_backup" -eq 1 ]; then
		nexus_say 'Skipping the uploads copy. --no-volume-backup was given.'
		return 0
	fi
	nexus_copy_volumes
}

nexus_postgres_major() {
	nexus_pg_image=$(sed -n 's/^[[:space:]]*image:[[:space:]]*\(postgres:[^[:space:]]*\).*/\1/p' "$1" | head -n 1)
	if [ -z "$nexus_pg_image" ]; then
		nexus_pg_image=$(sed -n 's/^[[:space:]]*image:[[:space:]]*${NEXUS_POSTGRES_IMAGE:-\([^}]*\)}.*/\1/p' "$1" | head -n 1)
		if [ -n "$nexus_pg_image" ] && [ -n "$(nexus_compose_value NEXUS_POSTGRES_IMAGE)" ]; then
			nexus_pg_image=$(nexus_compose_value NEXUS_POSTGRES_IMAGE)
		fi
	fi
	nexus_pg_image=${nexus_pg_image%%@*}
	case ${nexus_pg_image##*/} in
		*:*) printf '%s\n' "${nexus_pg_image##*:}" | sed -n 's/^\([0-9][0-9]*\).*/\1/p' ;;
	esac
}

# A newer Postgres major does not read the data directory an older major wrote,
# so moving between majors means dumping, removing the volume that holds the
# database, and restoring into an empty directory. Removing that volume is the
# one destructive act in the whole procedure, and it is not something a script
# should do on an operator's behalf while they read scrolling output.
#
# The refreshed file is still in the scratch directory when this runs, so a
# refusal here leaves the instance exactly as it was.
nexus_guard_postgres_major() {
	nexus_old_major=$(nexus_postgres_major "$opt_dir/$nexus_compose_base")
	nexus_new_major=$(nexus_postgres_major "$nexus_scratch/docker-compose.yml.part")
	if [ -z "$nexus_old_major" ] || [ -z "$nexus_new_major" ]; then
		return 0
	fi
	if [ "$nexus_old_major" = "$nexus_new_major" ]; then
		return 0
	fi
	nexus_fail 3 "The refreshed docker-compose.yml pins postgres:$nexus_new_major and this instance runs postgres:$nexus_old_major. A major version change goes through a dump, an empty data directory and a restore, which this script does not do because it destroys the volume holding the database. Nothing was changed. The procedure is at https://nexus.dev/operator/upgrading/"
}

# Which mounted files the refresh changes, and therefore which services need a
# restart rather than a recreate. The comparison happens while the new copies are
# still in the scratch directory, because once they are in place the old bytes
# are gone.
nexus_note_mounted_changes() {
	: > "$nexus_scratch/restart"
	nexus_mounted_files > "$nexus_scratch/mounts"
	while read -r nexus_file nexus_service; do
		[ -n "$nexus_file" ] || continue
		if [ ! -e "$opt_dir/$nexus_file" ]; then
			continue
		fi
		if ! cmp -s "$opt_dir/$nexus_file" "$nexus_scratch/$nexus_file.part"; then
			printf '%s %s\n' "$nexus_file" "$nexus_service" >> "$nexus_scratch/restart"
		fi
	done < "$nexus_scratch/mounts"
}

# The service names the docker-compose.yml in place defines, one per line.
#
# A rollback puts back the stack files the record holds, and a record taken
# before a service was renamed names the old service. Restarting a service the
# file in place does not define fails, so the name is checked first.
#
# By hand:
#   docker compose config --services
nexus_compose_services() {
	nexus_compose_query --services || return 1
	sort -u "$nexus_scratch/compose-out"
}

nexus_restart_mounted() {
	[ -s "$nexus_scratch/restart" ] || return 0
	if ! nexus_compose_services > "$nexus_scratch/services"; then
		nexus_fail 6 "$nexus_engine compose config --services failed in $opt_dir, so the services that mount a refreshed file cannot be restarted. Compose printed:
$(nexus_compose_error '  ')"
	fi
	while read -r nexus_file nexus_service; do
		[ -n "$nexus_service" ] || continue
		if ! grep -qxF "$nexus_service" "$nexus_scratch/services"; then
			nexus_say "Skipping the restart of $nexus_service, because the $nexus_compose_base in $opt_dir defines no service by that name."
			continue
		fi
		nexus_say "Restarting $nexus_service, because $nexus_file is mounted into it and up -d does not reload a mounted file."
		if ! $nexus_engine compose restart "$nexus_service"; then
			nexus_fail 6 "$nexus_engine compose restart $nexus_service failed in $opt_dir."
		fi
	done < "$nexus_scratch/restart"
}

# A record is created before the upgrade touches anything, so a run that refuses
# or fails after this point still leaves one behind. Such a record describes the
# state the instance is already in, which makes a rollback to it a no-op rather
# than a mistake. Only the newest record is ever used.
nexus_prepare_record() {
	mkdir -p "$opt_backup_dir"
	chmod 700 "$opt_backup_dir"
	nexus_record="$opt_backup_dir/$NEXUS_RECORD_PREFIX$(date -u +%Y%m%dT%H%M%SZ)"
	if [ -e "$nexus_record" ]; then
		nexus_fail 3 "$nexus_record exists already."
	fi
	mkdir -m 700 "$nexus_record"
}

# Record names include a UTC stamp, so the shell expands the glob in byte order
# and the last match is the most recent upgrade.
nexus_newest_record() {
	nexus_newest=''
	for nexus_candidate in "$opt_backup_dir/$NEXUS_RECORD_PREFIX"*; do
		[ -d "$nexus_candidate" ] || continue
		nexus_newest=${nexus_candidate##*/}
	done
	printf '%s' "$nexus_newest"
}

nexus_verify_stack() {
	nexus_say 'Waiting for every service to report ready.'
	if ! nexus_wait_ready; then
		nexus_fail 6 "The stack is not ready after $NEXUS_READY_TIMEOUT seconds. $(nexus_not_ready_detail)
Read $nexus_engine compose logs in $opt_dir."
	fi
	nexus_origin_value=$(nexus_public_origin)
	if [ -n "$nexus_origin_value" ]; then
		nexus_probe "$nexus_origin_value"
	fi
}

# A plan writes nothing itself. The run it describes writes .env before it reads
# anything when a required key is absent, and saying otherwise would describe a
# different run.
nexus_plan_footer() {
	if [ -s "$nexus_scratch/plan-secrets" ]; then
		nexus_say 'This plan wrote nothing. The run it describes writes the keys above into .env before anything else.'
	else
		nexus_say 'Nothing outside a temporary directory was written.'
	fi
}

nexus_plan_update() {
	nexus_say 'Plan: upgrade'
	nexus_say "  directory     $opt_dir"
	nexus_say "  ref           $opt_ref"
	nexus_say "  image tag     $(nexus_env_value NEXUS_IMAGE_TAG) from .env"
	nexus_say "  backup dir    $opt_backup_dir"
	nexus_missing_required_secrets > "$nexus_scratch/plan-secrets"
	if [ -s "$nexus_scratch/plan-secrets" ]; then
		nexus_say '  writes .env   the run mints these before it reads anything, because the refreshed stack requires them'
		while read -r nexus_key; do
			[ -n "$nexus_key" ] || continue
			nexus_say "                $nexus_key"
		done < "$nexus_scratch/plan-secrets"
	fi
	nexus_running_image_ids > "$nexus_scratch/running"
	if ! nexus_compose_images > "$nexus_scratch/refs"; then
		nexus_say '  refusal       $nexus_engine compose config --images fails here, and step 1 of the upgrade reads that list'
		nexus_say '  compose said'
		nexus_compose_error '    '
		if [ -s "$nexus_scratch/plan-secrets" ]; then
			nexus_say '  outcome       the run writes the keys above first, which may be what Compose is missing, so this refusal may not stand'
		else
			nexus_say '  outcome       the run stops on step 1 and changes nothing'
		fi
		nexus_plan_footer
		return 0
	fi
	nexus_say '  running now'
	while read -r nexus_ref; do
		[ -n "$nexus_ref" ] || continue
		nexus_id=$(nexus_recorded_id_for "$nexus_ref")
		if [ -z "$nexus_id" ]; then
			nexus_id='no container runs this image'
		fi
		nexus_say "    $nexus_ref $nexus_id"
	done < "$nexus_scratch/refs"
	if [ "$opt_skip_backup" -eq 1 ]; then
		nexus_say '  backup        none, and a schema change would have no way back'
	elif [ "$opt_no_volume_backup" -eq 1 ]; then
		nexus_say '  backup        the database dump, .env, and the stack files'
	else
		if [ "$opt_no_volume_compression" -eq 1 ]; then
			nexus_say '  backup        the database dump, the uploads volume uncompressed, .env, and the stack files'
		else
			nexus_say '  backup        the database dump, the uploads volume, .env, and the stack files'
		fi
		nexus_say '  downtime      the stack stops for the uploads copy, then again for the recreate'
	fi
	nexus_fetch_stack
	nexus_say '  file changes'
	nexus_changed=0
	while read -r nexus_file; do
		[ -n "$nexus_file" ] || continue
		nexus_placed=$(nexus_placed_name "$nexus_file")
		if [ ! -e "$opt_dir/$nexus_placed" ]; then
			nexus_say "    $nexus_placed is new"
			nexus_changed=1
		elif cmp -s "$opt_dir/$nexus_placed" "$nexus_scratch/$nexus_file.part"; then
			nexus_say "    $nexus_placed is unchanged"
		else
			nexus_say "    $nexus_placed changes"
			nexus_changed=1
		fi
	done < "$nexus_scratch/files"
	if [ "$nexus_changed" -eq 0 ]; then
		nexus_say "  note          ref $opt_ref moves no stack file"
	fi
	nexus_old_major=$(nexus_postgres_major "$opt_dir/$nexus_compose_base")
	nexus_new_major=$(nexus_postgres_major "$nexus_scratch/docker-compose.yml.part")
	if [ -n "$nexus_old_major" ] && [ -n "$nexus_new_major" ] && [ "$nexus_old_major" != "$nexus_new_major" ]; then
		nexus_say "  refusal       postgres moves from $nexus_old_major to $nexus_new_major, which this script does not do"
		nexus_say '  outcome       the run stops at that refusal and changes nothing'
		nexus_plan_footer
		return 0
	fi
	nexus_note_mounted_changes
	if [ -s "$nexus_scratch/restart" ]; then
		while read -r nexus_file nexus_service; do
			[ -n "$nexus_service" ] || continue
			nexus_say "  restart       $nexus_service, because $nexus_file changes and a mounted file survives up -d"
		done < "$nexus_scratch/restart"
	fi
	nexus_say '  commands      $nexus_engine compose pull, $nexus_engine compose up -d'
	nexus_plan_footer
	nexus_say 'Drop --dry-run to run this.'
}

nexus_plan_rollback() {
	nexus_rollback_name=$(nexus_newest_record)
	if [ -z "$nexus_rollback_name" ]; then
		nexus_fail 2 "No record in $opt_backup_dir. A rollback needs an upgrade that recorded what was running."
	fi
	nexus_rollback_dir="$opt_backup_dir/$nexus_rollback_name"
	nexus_recorded_tag=$(head -n 1 "$nexus_rollback_dir/$NEXUS_TAG_FILE" 2>/dev/null || true)
	nexus_current_tag=$(nexus_env_value NEXUS_IMAGE_TAG)
	nexus_say 'Plan: rollback'
	nexus_say "  directory     $opt_dir"
	nexus_say "  record        $nexus_rollback_dir"
	if [ "$nexus_recorded_tag" = "$nexus_current_tag" ]; then
		nexus_say "  image tag     stays $nexus_current_tag, so the recorded image IDs move back onto it"
	else
		nexus_say "  image tag     $nexus_current_tag becomes $nexus_recorded_tag in .env"
	fi
	nexus_say '  images'
	while read -r nexus_ref nexus_id; do
		[ -n "$nexus_ref" ] || continue
		if [ "$nexus_id" = '-' ]; then
			nexus_say "    $nexus_ref was not recorded with an ID"
		elif $nexus_engine image inspect --format '{{.Id}}' "$nexus_id" >/dev/null 2>&1; then
			nexus_say "    $nexus_ref back to $nexus_id"
		else
			nexus_say "    $nexus_ref is gone from this host, so $nexus_id cannot come back"
		fi
	done < "$nexus_rollback_dir/$NEXUS_IMAGES_FILE"
	nexus_say "  files         restored from $nexus_rollback_dir"
	nexus_say '  database      stays where the new release left it'
	nexus_say 'Nothing is written. Drop --dry-run to run this.'
}

# The full upgrade, in the order that leaves a working instance behind at every
# point it can fail.
nexus_run_update() {
	nexus_open_scratch "$opt_dir"
	nexus_stack_files > "$nexus_scratch/files"
	nexus_fill_required_secrets
	nexus_record_state
	nexus_save_current_files
	nexus_backup
	nexus_fetch_stack
	nexus_guard_postgres_major
	nexus_note_mounted_changes
	nexus_place_stack
	# The pull runs while the old containers still serve, so the long part of an
	# upgrade costs no downtime.
	#
	# By hand:
	#   docker compose pull
	nexus_say 'Pulling images.'
	if ! $nexus_engine compose pull; then
		nexus_fail 4 "$nexus_engine compose pull failed in $opt_dir. The stack files are refreshed and the instance still runs the old images."
	fi
	# Recreates the containers whose image or configuration changed and leaves
	# the rest running.
	#
	# By hand:
	#   docker compose up -d --remove-orphans
	#
	# Behind your own reverse proxy every command names the overlay, which
	# COMPOSE_FILE in .env does once. An invocation without it recreates the edge
	# from the base file, which binds 80 and 443 and requests its own
	# certificate.
	#
	# api, worker, users-shard and messages-shard each apply the database schema
	# while they start, so the upgrade is not finished until all four are back
	# up. All four take the same Postgres advisory lock around that work, so
	# several of them starting at once is safe.
	#
	# app-proxy waits for api to report healthy and the edge waits for the
	# Gateway, so the hostname returns errors for a minute or two after this
	# call. The api healthcheck allows 90 seconds before it counts a failure.
	nexus_say 'Recreating the stack.'
	if ! $nexus_engine compose up -d --remove-orphans; then
		nexus_fail 6 "$nexus_engine compose up -d failed in $opt_dir. Read $nexus_engine compose logs there."
	fi
	nexus_restart_mounted
	nexus_verify_stack
	nexus_say "Instance upgraded in $opt_dir."
	nexus_say "The record of what it ran before is in $nexus_record."
	nexus_say "Go back with sh install.sh --rollback --dir $opt_dir."
	exit 0
}

# Puts one line of .env back, and proves it touched nothing else.
#
# NEXUS_IMAGE_TAG is the only key this function writes. Every other line,
# which is every secret, is compared byte for byte before the new file replaces
# the old one, so a rewrite that lost or changed a secret cannot land.
nexus_set_image_tag() {
	if ! grep -q '^NEXUS_IMAGE_TAG=' "$opt_dir/.env"; then
		nexus_fail 3 "$opt_dir/.env declares no NEXUS_IMAGE_TAG, so the tag cannot be put back. Set it by hand."
	fi
	nexus_old_umask=$(umask)
	umask 077
	sed "s|^NEXUS_IMAGE_TAG=.*|NEXUS_IMAGE_TAG=$1|" "$opt_dir/.env" > "$nexus_scratch/env.new"
	grep -v '^NEXUS_IMAGE_TAG=' "$opt_dir/.env" > "$nexus_scratch/env.before" || true
	grep -v '^NEXUS_IMAGE_TAG=' "$nexus_scratch/env.new" > "$nexus_scratch/env.after" || true
	if [ ! -s "$nexus_scratch/env.before" ] || ! cmp -s "$nexus_scratch/env.before" "$nexus_scratch/env.after"; then
		umask "$nexus_old_umask"
		nexus_fail 3 'Rewriting NEXUS_IMAGE_TAG would have changed another line in .env. Nothing was written.'
	fi
	mv "$nexus_scratch/env.new" "$opt_dir/.env"
	chmod 600 "$opt_dir/.env"
	umask "$nexus_old_umask"
	nexus_say "NEXUS_IMAGE_TAG in .env is $1."
}

# A rollback moves the images and the stack files back. The database stays where
# the new release left it, because api, worker, users-shard and messages-shard
# apply schema work in place while they start and an older image does not undo
# it. Across a release that changed the schema, the dump in the record is the
# only way back, and putting it back is a separate decision an operator makes.
#
# Two shapes, depending on what the upgrade moved:
#
#   A pinned tag moved, so the old images still have their own tag. The tag goes
#   back into .env and Compose finds them.
#
#     By hand: set NEXUS_IMAGE_TAG back, then docker compose up -d
#
#   A moving tag such as v1 stayed put and the images under it changed. The
#   recorded image IDs are still on the host until a prune removes them, so the
#   old ID goes back onto the tag it had.
#
#     By hand: docker image tag <recorded id> ghcr.io/nexusapp/nexus-api:v1
#
# Neither shape pulls. A pull is what moved the instance forward in the first
# place, and running one here would undo the rollback in the same breath.
nexus_run_rollback() {
	nexus_rollback_name=$(nexus_newest_record)
	if [ -z "$nexus_rollback_name" ]; then
		nexus_fail 2 "No record in $opt_backup_dir. A rollback needs an upgrade that recorded what was running."
	fi
	nexus_rollback_dir="$opt_backup_dir/$nexus_rollback_name"
	if [ ! -s "$nexus_rollback_dir/$NEXUS_IMAGES_FILE" ]; then
		nexus_fail 2 "$nexus_rollback_dir records no images."
	fi
	nexus_open_scratch "$opt_dir"
	nexus_stack_files > "$nexus_scratch/files"
	nexus_say "Rolling back to $nexus_rollback_dir."

	nexus_recorded_tag=$(head -n 1 "$nexus_rollback_dir/$NEXUS_TAG_FILE" 2>/dev/null || true)
	nexus_current_tag=$(nexus_env_value NEXUS_IMAGE_TAG)
	nexus_moved=0
	if [ -n "$nexus_recorded_tag" ] && [ "$nexus_recorded_tag" != "$nexus_current_tag" ]; then
		case $nexus_recorded_tag in
			''|*' '*|*/*) nexus_fail 3 "The recorded image tag $nexus_recorded_tag is not an image tag." ;;
		esac
		nexus_set_image_tag "$nexus_recorded_tag"
		nexus_moved=1
	else
		while read -r nexus_ref nexus_id; do
			[ -n "$nexus_ref" ] || continue
			[ "$nexus_id" != '-' ] || continue
			if ! $nexus_engine image inspect --format '{{.Id}}' "$nexus_id" >/dev/null 2>&1; then
				nexus_say "$nexus_ref is gone from this host, so it keeps the image it has now."
				continue
			fi
			if ! $nexus_engine image tag "$nexus_id" "$nexus_ref"; then
				nexus_fail 3 "Cannot put $nexus_id back on $nexus_ref."
			fi
			nexus_moved=1
		done < "$nexus_rollback_dir/$NEXUS_IMAGES_FILE"
	fi
	if [ "$nexus_moved" -eq 0 ]; then
		nexus_fail 2 "Nothing in $nexus_rollback_dir can be put back. The recorded tag is the one in .env and every recorded image has been removed from this host, which a $nexus_engine image prune does."
	fi

	while read -r nexus_file; do
		[ -n "$nexus_file" ] || continue
		if [ -s "$nexus_rollback_dir/$nexus_file" ]; then
			cp -p "$nexus_rollback_dir/$nexus_file" "$opt_dir/$(nexus_placed_name "$nexus_file")"
		elif [ -e "$nexus_rollback_dir/$nexus_file" ]; then
			nexus_fail 3 "$nexus_rollback_dir/$nexus_file is empty, so restoring it would replace a working file with nothing. Nothing was restored. Take the file from another record or from the ref the record names."
		fi
	done < "$nexus_scratch/files"
	nexus_say "Stack files in $opt_dir are the ones the record holds."

	nexus_say 'Recreating the stack.'
	if ! $nexus_engine compose up -d --remove-orphans; then
		nexus_fail 6 "$nexus_engine compose up -d failed in $opt_dir. Read $nexus_engine compose logs there."
	fi
	# The mounted file came back from the record, so its service restarts.
	# Comparing it first would save one restart and cost the reader a reason.
	nexus_mounted_files > "$nexus_scratch/restart"
	nexus_restart_mounted
	nexus_verify_stack
	nexus_say "Instance rolled back in $opt_dir."
	if [ -s "$nexus_rollback_dir/$NEXUS_DUMP_FILE" ]; then
		nexus_say "The database did not move. Restore it from $nexus_rollback_dir/$NEXUS_DUMP_FILE only when the release you left changed the schema."
	else
		nexus_say "The database did not move. That record holds no dump, because the upgrade ran with --skip-backup-accept-data-loss, so a release that changed the schema has no way back."
	fi
	exit 0
}

nexus_preflight
nexus_validate_options
nexus_resolve_values

if [ "$opt_update" -eq 1 ]; then
	nexus_refresh_installer
fi

if [ "$opt_update" -eq 1 ] || [ "$opt_rollback" -eq 1 ]; then
	nexus_require_instance
	nexus_resolve_ref
	nexus_require_compose_files
	cd "$opt_dir"
	nexus_set_project
	if [ "$opt_dry_run" -eq 1 ]; then
		# The dry run downloads into a temporary directory so it can name the
		# files that actually change, the services that actually restart, and a
		# Postgres major that would stop the run. It removes that directory on
		# exit and touches nothing in the working directory.
		nexus_open_scratch "${TMPDIR:-/tmp}"
		nexus_stack_files > "$nexus_scratch/files"
		if [ "$opt_rollback" -eq 1 ]; then
			nexus_plan_rollback
		else
			nexus_plan_update
		fi
		exit 0
	fi
	if [ "$opt_rollback" -eq 1 ]; then
		nexus_run_rollback
	fi
	nexus_run_update
fi

nexus_resolve_ref

if [ "$opt_dry_run" -eq 1 ]; then
	nexus_print_plan
	exit 0
fi

mkdir -p "$opt_dir"
cd "$opt_dir"

if [ -e "$opt_dir/.env" ]; then
	nexus_fail 3 "$opt_dir/.env exists. Run with --update to upgrade the instance and keep the secrets."
fi

nexus_open_scratch "$opt_dir"
nexus_fetch_stack
nexus_place_stack
nexus_check_volumes

nexus_say 'Generating secrets.'
if ! nexus_generate_vapid; then
	nexus_fail 5 "Could not generate a VAPID key of the required shape in $NEXUS_VAPID_ATTEMPTS attempts."
fi
nexus_write_env
nexus_say "Wrote $opt_dir/.env, readable by you alone."
nexus_say 'That .env serves https on 443, which is the only layout this script writes. The .env.example beside it says what to change for any other one.'

if [ "$opt_no_start" -eq 1 ]; then
	nexus_say "Start the instance with $nexus_engine compose up -d in $opt_dir."
	nexus_say_first_run
	nexus_say "Secrets are in $opt_dir/.env. Back that file up."
	exit 0
fi

nexus_say 'Pulling images. The first start pulls eighteen of them, which takes several minutes.'
if ! $nexus_engine compose pull; then
	nexus_fail 4 "$nexus_engine compose pull failed in $opt_dir. Nothing was started."
fi
nexus_say 'Starting the stack.'
if ! $nexus_engine compose up -d; then
	nexus_fail 6 "$nexus_engine compose up -d failed in $opt_dir. Read $nexus_engine compose logs there."
fi
nexus_say 'Waiting for every service to report ready.'
if ! nexus_wait_ready; then
	nexus_fail 6 "The stack is not ready after $NEXUS_READY_TIMEOUT seconds. $(nexus_not_ready_detail)
Read $nexus_engine compose logs in $opt_dir."
fi
nexus_ready_origin=$(nexus_public_origin)
if [ -z "$nexus_ready_origin" ]; then
	nexus_ready_origin="https://$opt_domain"
fi
nexus_probe "$nexus_ready_origin"

nexus_say "Instance ready at $nexus_ready_origin"
nexus_say_first_run
nexus_say "Secrets are in $opt_dir/.env. Back that file up."
