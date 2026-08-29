#!/usr/bin/env bash
# Validation failed: record the failure on the PR, close it, update the state.
# Runs inside jules-validate.yml with GH_TOKEN set.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-.}"

. .jules-loop/scripts/lib.sh

PR_NUMBER="${PR_NUMBER:?PR_NUMBER required}"

pr_body=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}" --jq '.body // ""')
disc_num=$(printf '%s' "$pr_body" | grep -oE 'discussions/[0-9]+' | head -1 | grep -oE '[0-9]+' || true)

log_tail=$(gh run view "${GITHUB_RUN_ID:-}" --log-failed 2>/dev/null | tail -60 || true)
[ -n "$log_tail" ] || log_tail="See the run logs for details."

comment=$(jq -n --arg log "$log_tail" --arg pr "${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID:-}" '
  "Automated validation failed, so this fix was not merged and nothing was posted upstream.\n\n"
  + "Failed step log (tail):\n\n~~~~\n" + $log + "\n~~~~\n\n"
  + "Run: " + $pr')
gh pr comment "$PR_NUMBER" --body "$comment" || true

gh pr close "$PR_NUMBER" --comment "Validation failed; closing. The loop will pick the next task on its next run." || true

if [ -n "$disc_num" ]; then
  state=$(state_get)
  state=$(jq -c --arg n "$disc_num" '.dispatched[$n].status = "failed"' <<<"$state")
  state_set "$state"
fi
echo "failure recorded"
