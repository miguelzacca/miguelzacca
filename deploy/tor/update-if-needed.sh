#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# == 0 ]] || { printf 'Uso: sudo bash deploy/tor/update-if-needed.sh\n' >&2; exit 1; }
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
# The shared deploy entry point holds ONE flock across fetch, comparison, build,
# health check and SHA recording. No nested lock or unlocked hand-off window.
exec /bin/bash "$SCRIPT_DIR/deploy.sh" --if-needed
