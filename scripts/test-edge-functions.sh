#!/usr/bin/env bash
# Edge function test runner — local and CI.
#
# Usage:
#   npm run test:functions                 # Tier 1 (no side effects)
#   RUN_SIDE_EFFECT_TESTS=1 npm run test:functions   # + Tier 2
#   SKIP_SLOW_TESTS=1 npm run test:functions         # skip rate-limit burns
#
# Requires .env.test (copy .env.test.example) and Deno >= 1.40.
set -uo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env.test}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found — copy .env.test.example and fill it in" >&2
  exit 1
fi

if ! command -v deno >/dev/null; then
  echo "error: deno is not installed (https://docs.deno.com/runtime/getting_started/installation/)" >&2
  exit 1
fi

mkdir -p test-results

# RUN_SIDE_EFFECT_TESTS / SKIP_SLOW_TESTS from the shell win over .env.test;
# deno's --env-file does not override already-exported variables.
deno test \
  --allow-net --allow-env \
  --env-file="$ENV_FILE" \
  --config supabase/functions/tests/deno.json \
  --junit-path=test-results/edge-functions.xml \
  supabase/functions/tests/
status=$?

echo
python3 scripts/edge-test-summary.py test-results/edge-functions.xml || true

exit $status
