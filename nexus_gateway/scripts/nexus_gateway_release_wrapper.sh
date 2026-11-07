#!/usr/bin/env sh

# SPDX-License-Identifier: Nebula

set -eu

command="${1:-}"
case "$command" in
eval | console | remote_console | remote | remsh | console_clean | console_boot | daemon | daemon_boot | daemon_attach | escript)
	echo "nexus_gateway: '$command' is disabled in production; use bounded rpc/runtime tools instead." >&2
	exit 64
	;;
esac

script_dir="$(CDPATH='' cd "$(dirname "$0")" && pwd -P)"
node_name_file="$script_dir/../node_name"
if [ -r "$node_name_file" ]; then
	NEXUS_ERLANG_NODE_NAME="$(cat "$node_name_file")"
	export NEXUS_ERLANG_NODE_NAME
fi
if [ -r "${NEXUS_ERLANG_COOKIE_FILE:-}" ] && [ -z "$(printf '%s' "${NEXUS_ERLANG_COOKIE:-}" | tr -d '[:space:]')" ]; then
	NEXUS_ERLANG_COOKIE="$(cat "$NEXUS_ERLANG_COOKIE_FILE")"
	export NEXUS_ERLANG_COOKIE
fi
exec "$script_dir/nexus_gateway.real" "$@"
