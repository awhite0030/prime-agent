#!/usr/bin/env bash
# Manually (re-)post the draft comment from a PR to its upstream Discussion.
# Used by jules-contribute.yml. Inputs: DISCUSSION_NUMBER, PR_NUMBER.
set -euo pipefail
cd "${GITHUB_WORKSPACE:-.}"

. .jules-loop/scripts/lib.sh

PR_NUMBER="${PR_NUMBER:?PR_NUMBER required}"
DISCUSSION_NUMBER="${DISCUSSION_NUMBER:?DISCUSSION_NUMBER required}"

body=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments?per_page=100" \
  | jq -r '[.[] | select(.body | contains("<!-- jules-loop-draft -->"))] | last | .body // empty')

if [ -z "$body" ]; then
  echo "No draft comment found on PR #${PR_NUMBER}" >&2
  exit 1
fi

draft_file=$(mktemp); query_file=$(mktemp); vars_file=$(mktemp)
trap 'rm -f "$draft_file" "$query_file" "$vars_file"' EXIT

# Strip the marker and the trailing status line; keep the draft block.
printf '%s' "$body" | sed '/^<!-- jules-loop-draft -->$/d; /^Upstream comment draft/d; /^---$/d; /^posted: /d; /^not posted (/d' > "$draft_file"

cat > "$query_file" <<'Q'
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) { id url title }
  }
}
Q
jq -n --arg owner "PrimeIntellect-ai" --arg name "prime-agent" --argjson number "$DISCUSSION_NUMBER" \
  '{owner: $owner, name: $name, number: $number}' > "$vars_file"
disc_id=$(graphql_file_request "$query_file" "$(cat "$vars_file")" \
  | jq -r '.data.repository.discussion.id // empty')
[ -n "$disc_id" ] || { echo "Discussion #${DISCUSSION_NUMBER} not found upstream" >&2; exit 1; }

cat > "$query_file" <<'Q'
mutation($id: ID!, $body: String!) {
  addDiscussionComment(input: {discussionId: $id, body: $body}) {
    comment { url }
  }
}
Q
jq -n --arg id "$disc_id" --rawfile body "$draft_file" '{id: $id, body: $body}' > "$vars_file"
post_url=$(graphql_file_request "$query_file" "$(cat "$vars_file")" \
  | jq -r '.data.addDiscussionComment.comment.url // empty')
[ -n "$post_url" ] || { echo "Posting failed" >&2; exit 1; }
echo "posted upstream: $post_url"

state=$(state_get)
state=$(jq -c --arg n "$DISCUSSION_NUMBER" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg u "$post_url" \
  --arg d "$(date -u +%F)" \
  '.posted[$n] = {ts: $ts, commentUrl: $u} | .postDay = $d | .postCount = ((.postCount // 0) + 1)' <<<"$state")
state=$(state_prune <<<"$state")
state_set "$state"
echo "done"
