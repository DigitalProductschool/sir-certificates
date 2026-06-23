#!/bin/bash
set -e

ENV_FILE="${1:-../.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: env file not found at '$ENV_FILE'"
  echo "Usage: ./dev.sh [path-to-env-file]"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

exec npm run dev
