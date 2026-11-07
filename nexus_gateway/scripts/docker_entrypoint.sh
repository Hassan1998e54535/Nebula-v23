#!/usr/bin/env sh

# SPDX-License-Identifier: Nebula

set -eu

is_positive_int() {
	case "${1:-}" in
	'' | 0* | *[!0-9]*) return 1 ;;
	*) [ "$1" -gt 0 ] ;;
	esac
}

available_cpu_count() {
	cpu_quota=""
	cpu_period=""
	if [ -r /sys/fs/cgroup/cpu.max ]; then
		read -r cpu_quota cpu_period </sys/fs/cgroup/cpu.max || true
	else
		for cgroup_dir in /sys/fs/cgroup/cpu /sys/fs/cgroup/cpu,cpuacct; do
			if [ -r "$cgroup_dir/cpu.cfs_quota_us" ] && [ -r "$cgroup_dir/cpu.cfs_period_us" ]; then
				read -r cpu_quota <"$cgroup_dir/cpu.cfs_quota_us" || true
				read -r cpu_period <"$cgroup_dir/cpu.cfs_period_us" || true
				break
			fi
		done
	fi
	if is_positive_int "$cpu_quota" && is_positive_int "$cpu_period"; then
		echo "$(((cpu_quota + cpu_period - 1) / cpu_period))"
		return 0
	fi
	cpu_count="$(nproc 2>/dev/null || echo 1)"
	if is_positive_int "$cpu_count"; then
		echo "$cpu_count"
	else
		echo 1
	fi
}

clamp_int() {
	value="$1"
	min="$2"
	max="$3"
	if [ "$value" -lt "$min" ]; then
		value="$min"
	fi
	if [ "$value" -gt "$max" ]; then
		value="$max"
	fi
	echo "$value"
}

is_positive_int "${NEXUS_ERLANG_SCHEDULERS_MIN:-}" || NEXUS_ERLANG_SCHEDULERS_MIN=2
is_positive_int "${NEXUS_ERLANG_SCHEDULERS_MAX:-}" || NEXUS_ERLANG_SCHEDULERS_MAX=16
: "${NEXUS_ERLANG_NODE_NAME:=nexus_gateway@127.0.0.1}"
: "${NEXUS_ERLANG_DIST_PORT:=8081}"
node_name_file=/opt/nexus_gateway/node_name

if [ -n "${NEXUS_ERLANG_NODE_NAME_PREFIX:-}" ]; then
	case "$NEXUS_ERLANG_NODE_NAME_PREFIX" in
	*[!A-Za-z0-9_]*)
		echo 'NEXUS_ERLANG_NODE_NAME_PREFIX may only contain letters, digits and underscores.' >&2
		exit 1
		;;
	esac
	node_nonce="$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')"
	NEXUS_ERLANG_NODE_NAME="${NEXUS_ERLANG_NODE_NAME_PREFIX}_${node_nonce}@${NEXUS_ERLANG_NODE_NAME#*@}"
	printf '%s\n' "$NEXUS_ERLANG_NODE_NAME" >"$node_name_file"
else
	rm -f "$node_name_file"
fi

case "${NEXUS_ERLANG_COOKIE_FILE:-}" in
*[![:space:]]*)
	case "${NEXUS_ERLANG_COOKIE:-}" in
	*[![:space:]]*)
		echo 'NEXUS_ERLANG_COOKIE and NEXUS_ERLANG_COOKIE_FILE are both set, set only one.' >&2
		exit 1
		;;
	esac
	if ! NEXUS_ERLANG_COOKIE="$(cat -- "$NEXUS_ERLANG_COOKIE_FILE")"; then
		echo "NEXUS_ERLANG_COOKIE_FILE could not read $NEXUS_ERLANG_COOKIE_FILE." >&2
		exit 1
	fi
	;;
esac

if [ -z "${NEXUS_ERLANG_COOKIE:-}" ]; then
	echo 'NEXUS_ERLANG_COOKIE is required.' >&2
	exit 1
fi

if ! is_positive_int "${NEXUS_ERLANG_SCHEDULERS:-}"; then
	NEXUS_ERLANG_SCHEDULERS="$(clamp_int "$(available_cpu_count)" "$NEXUS_ERLANG_SCHEDULERS_MIN" "$NEXUS_ERLANG_SCHEDULERS_MAX")"
fi

if ! is_positive_int "${NEXUS_ERLANG_DIRTY_CPU_SCHEDULERS:-}"; then
	NEXUS_ERLANG_DIRTY_CPU_SCHEDULERS="$(((NEXUS_ERLANG_SCHEDULERS * 2 + 2) / 3))"
fi

export NEXUS_ERLANG_NODE_NAME
export NEXUS_ERLANG_COOKIE
export NEXUS_ERLANG_DIST_PORT
export NEXUS_ERLANG_SCHEDULERS
export NEXUS_ERLANG_DIRTY_CPU_SCHEDULERS
export RELX_REPLACE_OS_VARS="${RELX_REPLACE_OS_VARS:-true}"

exec /opt/nexus_gateway/bin/nexus_gateway foreground
