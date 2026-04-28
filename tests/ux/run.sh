#!/usr/bin/env bash
# Run post-bookmarks UX tests via the shared pianotell-flarum-common harness.
#
# Usage:
#   tests/ux/run.sh                     # run all specs
#   tests/ux/run.sh bookmark-toggle     # run a single spec by basename

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

SPECS=(
  tests/ux/bookmark-toggle.spec.mjs
  tests/ux/bookmarks-page.spec.mjs
  tests/ux/button-positions.spec.mjs
  tests/ux/admin-settings.spec.mjs
  tests/ux/guest-behavior.spec.mjs
  tests/ux/visual-baseline.spec.mjs
)

HARNESS=".pianotell/tests/ux/run.sh"
[[ -f "$HARNESS" ]] || { echo "error: shared harness not found at $HARNESS — init submodules?" >&2; exit 2; }

if [[ $# -ge 1 ]]; then
  MATCH="$1"
  FILTERED=()
  for s in "${SPECS[@]}"; do
    if [[ "$(basename "$s" .spec.mjs)" == "$MATCH" ]]; then
      FILTERED+=("$s")
    fi
  done
  if [[ ${#FILTERED[@]} -eq 0 ]]; then
    echo "error: no spec matching '$MATCH'" >&2
    echo "available:" >&2
    for s in "${SPECS[@]}"; do echo "  $(basename "$s" .spec.mjs)" >&2; done
    exit 2
  fi
  SPECS=("${FILTERED[@]}")
fi

PASSED=0
FAILED=0
FAILURES=()

for spec in "${SPECS[@]}"; do
  name="$(basename "$spec" .spec.mjs)"
  printf '\n━━━ %s ━━━\n' "$name"
  if "$HARNESS" "$spec"; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
    FAILURES+=("$name")
  fi
done

printf '\n━━━ summary ━━━\n'
printf '  passed: %d / %d\n' "$PASSED" "$((PASSED + FAILED))"
if [[ $FAILED -gt 0 ]]; then
  printf '  FAILED: %s\n' "${FAILURES[*]}"
  exit 1
fi
