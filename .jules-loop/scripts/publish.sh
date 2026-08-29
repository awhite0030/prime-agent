#!/usr/bin/env bash
# Publish a validated Jules fix: draft the upstream Discussion comment, post it
# if the daily cap allows, then merge the PR on the fork. Runs in jules-validate.yml.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-.}"

. .jules-loop/scripts/lib.sh

PR_NUMBER="${PR_NUMBER:?PR_NUMBER required}"
AUTOPOST="${AUTOPOST:-true}"
MAX_POSTS="${MAX_POSTS:-2}"

# --- Safety: never publish or merge changes to the loop infrastructure --------
if gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/files" --paginate --jq '.[].path' \
   | grep -qE '^(\.github/|\.jules-loop/)'; then
  gh pr comment "$PR_NUMBER" --body "Manual review required: this pull request touches workflow/loop infrastructure. Not auto-merged, nothing posted upstream."
  echo "infra change detected - skipping publish"
  exit 0
fi

pr_json=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}")
head_branch=$(jq -r '.head.ref' <<<"$pr_json")
pr_body_file=$(mktemp)
draft_file=$(mktemp)
query_file=$(mktemp)
vars_file=$(mktemp)
trap 'rm -f "$pr_body_file" "$draft_file" "$query_file" "$vars_file"' EXIT

jq -r '.body // ""' <<<"$pr_json" > "$pr_body_file"

disc_num=$(grep -oE 'discussions/[0-9]+' "$pr_body_file" | head -1 | grep -oE '[0-9]+' || true)

# --- Build the upstream comment draft ------------------------------------------
draft=$(jq -rn --rawfile body "$pr_body_file" \
  --arg cmp "https://github.com/${GITHUB_REPOSITORY}/compare/main...${head_branch}" \
  --arg pr "https://github.com/${GITHUB_REPOSITORY}/pull/${PR_NUMBER}" '
  ($body | gsub("\r$"; "") | if length > 4000 then .[0:4000] + "\n..." else . end
     | split("\n") | map("> " + .) | join("\n")) as $quoted
  | "Investigated this report and produced a candidate fix, validated on a fork of this repository.\n\n"
    + "Root cause, fix and validation from the working notes:\n\n" + $quoted + "\n\n"
    + "Diff: " + $cmp + "\n"
    + "Full pull request: " + $pr + "\n\n"
    + "The change passes `npm run check` and the focused regression tests against current `main`. "
    + "If a fix for this is still wanted, I can open a pull request."')
printf '%s' "$draft" > "$draft_file"

# --- Decide whether to post -----------------------------------------------------
state=$(state_get)
today=$(date -u +%F)
posted_today=$(jq -r --arg d "$today" 'if .postDay == $d then (.postCount // 0) else 0 end' <<<"$state")
already=$(jq -r --arg n "${disc_num:-}" '($n != "") and ((.posted // {}) | has($n))' <<<"$state")

post_url=""
reason="autopost disabled"
if [ -n "$disc_num" ]; then
  if [ "$already" = "true" ]; then
    reason="already posted for discussion #${disc_num}"
  elif [ "$AUTOPOST" != "true" ]; then
    reason="autopost disabled"
  elif [ "$posted_today" -ge "$MAX_POSTS" ]; then
    reason="daily cap reached (${posted_today}/${MAX_POSTS})"
  else
    cat > "$query_file" <<'Q'
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) { id url title }
  }
}
Q
    jq -n --arg owner "PrimeIntellect-ai" --arg name "prime-agent" --argjson number "$disc_num" \
      '{owner: $owner, name: $name, number: $number}' > "$vars_file"
    disc_id=$(graphql_file_request "$query_file" "$(cat "$vars_file")" \
      | jq -r '.data.repository.discussion.id // empty')

    if [ -z "$disc_id" ]; then
      reason="discussion #${disc_num} not found upstream"
    else
      cat > "$query_file" <<'Q'
mutation($id: ID!, $body: String!) {
  addDiscussionComment(input: {discussionId: $id, body: $body}) {
    comment { url }
  }
}
Q
      jq -n --arg id "$disc_id" --rawfile body "$draft_file" \
        '{id: $id, body: $body}' > "$vars_file"
      post_url=$(graphql_file_request "$query_file" "$(cat "$vars_file")" \
        | jq -r '.data.addDiscussionComment.comment.url // empty')
      if [ -n "$post_url" ]; then
        reason="posted"
        state=$(jq -c --arg n "$disc_num" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg u "$post_url" \
          --arg d "$today" --argjson c "$((posted_today + 1))" \
          '.posted[$n] = {ts: $ts, commentUrl: $u} | .postDay = $d | .postCount = $c' <<<"$state")
        echo "posted upstream: $post_url"
      else
        reason="GraphQL post failed"
      fi
    fi
  fi
else
  reason="no upstream discussion linked in the PR description"
fi

# --- Audit trail on the fork's PR ------------------------------------------------
note="not posted (${reason})"
[ -n "$post_url" ] && note="posted: ${post_url}"
gh pr comment "$PR_NUMBER" --body-file - <<BODY || true
<!-- jules-loop-draft -->
Upstream comment draft${disc_num:+ (discussion #${disc_num})}:

---

${draft}

---

${note}
BODY

# --- Merge the validated fix; the merge event starts the next loop task ----------
if gh pr merge "$PR_NUMBER" --merge --delete-branch; then
  echo "merged PR #${PR_NUMBER}"
  [ -n "$disc_num" ] && state=$(jq -c --arg n "$disc_num" --arg p "https://github.com/${GITHUB_REPOSITORY}/pull/${PR_NUMBER}" \
    '.dispatched[$n].status = "merged" | .dispatched[$n].prUrl = $p' <<<"$state") || true
else
  echo "WARNING: merge failed for PR #${PR_NUMBER}; the cron run will reconcile" >&2
fi

state=$(state_prune <<<"$state")
state_set "$state"
echo "done"
