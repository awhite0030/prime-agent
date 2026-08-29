#!/usr/bin/env bash
# Run the regression tests touched by the current PR, using the exact
# focused-test form that AGENTS.md prescribes. Exits non-zero on any failure.
set -euo pipefail

git fetch --quiet origin main

changed=$(git diff --name-only origin/main...HEAD \
  | grep -E '^(packages/[^/]+/test/.*\.test\.ts|prime-agent-runtime/test/.*\.py)$' || true)

if [ -z "$changed" ]; then
  echo "No regression tests in the diff."
  exit 0
fi

fail=0
for f in $changed; do
  echo "::group::Focused test: $f"
  case "$f" in
    packages/*)
      pkg=${f#packages/}; pkg=${pkg%%/*}
      rel=${f#"packages/$pkg/"}
      echo "running in packages/$pkg: $rel"
      (cd "packages/$pkg" && npx tsx ../../node_modules/vitest/dist/cli.js --run "$rel") || fail=1
      ;;
    prime-agent-runtime/*)
      (cd prime-agent-runtime && uv run python -m unittest discover -s test) || fail=1
      ;;
  esac
  echo "::endgroup::"
done

exit $fail
