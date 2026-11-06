#!/bin/bash
set -e

ENV_FILE="${1:-../.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found at '$ENV_FILE'"
  echo "Usage: ./migrate.sh [path-to-env-file] [prisma migrate dev args...]"
  exit 1
fi
shift || true

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

exec npx prisma migrate dev "$@"
