#!/usr/bin/env bash
# Pick the next upstream bug-report discussion and dispatch a Jules session for it.
# Runs inside jules-loop.yml. Requires: JULES_API_KEY, GH_TOKEN (PAT, repo scope).
set -euo pipefail
cd "${GITHUB_WORKSPACE:-.}"

. .jules-loop/scripts/lib.sh

BUDGET="${BUDGET:-30}"
OVERRIDE_DISCUSSION="${OVERRIDE_DISCUSSION:-}"
SKIP_BUDGET="${SKIP_BUDGET:-false}"

state=$(state_get)

# --- 1. Reconcile dispatched sessions with their live state -------------------
today_count_note=""
for num in $(jq -r '.dispatched // {} | to_entries[]
                     | select(.value.status == "dispatched") | .key' <<<"$state"); do
  sid=$(jq -r --arg n "$num" '.dispatched[$n].sessionId' <<<"$state")
  [ -n "$sid" ] && [ "$sid" != "null" ] || continue

  sess=$(jules_get_session "$sid")
  st=$(jq -r '.state // "UNKNOWN"' <<<"$sess")
  ts=$(jq -r --arg n "$num" '.dispatched[$n].ts' <<<"$state")
  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  case "$st" in
    COMPLETED)
      pr_url=$(jq -r '[.outputs // [] | .[] | .pullRequest.url // empty] | first // empty' <<<"$sess")
      if [ -n "$pr_url" ] && [ "$pr_url" != "null" ]; then
        pr_num=${pr_url##*/}
        merged=$(gh api "repos/${GITHUB_REPOSITORY}/pulls/$pr_num" --jq .merged 2>/dev/null || echo false)
        if [ "$merged" = "true" ]; then new_status="merged"; else new_status="in_review"; fi
      else
        new_status="no_pr"
      fi
      state=$(jq -c --arg n "$num" --arg s "$new_status" --arg u "${pr_url:-}" \
        '.dispatched[$n].status = $s | if $u != "" then .dispatched[$n].prUrl = $u else . end' <<<"$state")
      echo "reconcile: discussion #$num session $sid -> $new_status"
      ;;
    FAILED)
      reason=$(jq -r '.sessionFailed.reason // ""' <<<"$sess" 2>/dev/null || true)
      echo "reconcile: discussion #$num session $sid FAILED ${reason}"
      state=$(jq -c --arg n "$num" '.dispatched[$n].status = "failed"' <<<"$state")
      ;;
    QUEUED|PLANNING|IN_PROGRESS|PAUSED)
      cutoff=$(date -u -d '6 hours ago' +%Y-%m-%dT%H:%M:%SZ)
      if [ "${ts:-}" \< "$cutoff" ]; then
        echo "reconcile: discussion #$num session $sid stuck in $st since $ts -> stuck"
        state=$(jq -c --arg n "$num" '.dispatched[$n].status = "stuck"' <<<"$state")
      else
        echo "reconcile: discussion #$num session $sid still $st"
      fi
      ;;
    AWAITING_USER_FEEDBACK)
      nudges=$(jq -r --arg n "$num" '.dispatched[$n].nudges // 0' <<<"$state")
      if [ "$nudges" -lt 3 ]; then
        jules_send_message "$sid" .jules-loop/scripts/nudge.txt >/dev/null \
          && echo "reconcile: discussion #$num session $sid was waiting for feedback -> nudged ($((nudges + 1))/3)"
        state=$(jq -c --arg n "$num" --argjson c "$((nudges + 1))" '.dispatched[$n].nudges = $c' <<<"$state")
      else
        echo "reconcile: discussion #$num session $sid asked again after 3 nudges -> stuck"
        state=$(jq -c --arg n "$num" '.dispatched[$n].status = "stuck"' <<<"$state")
      fi
      ;;
    AWAITING_PLAN_APPROVAL)
      jules_approve_plan "$sid" >/dev/null \
        && echo "reconcile: discussion #$num session $sid plan approved automatically"
      ;;
    *)
      echo "reconcile: discussion #$num session $sid state $st (left as-is)"
      ;;
  esac
done
state=$(state_prune <<<"$state")

# --- 2. In-flight guard (unless a specific discussion was requested) -----------
# A "dispatched" status means the Jules session has not reached a terminal
# state yet. While one is running, this run just watches: sleep, then trigger
# the next run to reconcile again.
in_flight=$(jq -r '[.dispatched // {} | to_entries[]
                     | select(.value.status == "dispatched")] | length' <<<"$state")

if [ -z "$OVERRIDE_DISCUSSION" ] && [ "$in_flight" -gt 0 ]; then
  echo "in-flight session(s): $in_flight - sleeping 10m, then re-checking"
  sleep 600
  gh workflow run jules-loop.yml --repo "${GITHUB_REPOSITORY}" --ref main \
    && echo "queued the next loop run" \
    || echo "WARNING: could not self-dispatch the next loop run"
  exit 0
fi

# --- 3. Budget guard ----------------------------------------------------------
if [ "$SKIP_BUDGET" != "true" ]; then
  used=$(jules_sessions_last_24h)
  echo "budget: ${used}/${BUDGET} Jules sessions in the last 24h"
  if [ "${used:-0}" -ge "$BUDGET" ]; then
    echo "Daily budget reached. Skipping dispatch."
    state_set "$state"
    exit 0
  fi
else
  echo "budget: skipped by request"
fi

# --- 4. Jules source check ------------------------------------------------------
sources=$(curl -sS -H "X-Goog-Api-Key: ${JULES_API_KEY}" "${JULES_API}/sources?pageSize=100")
if ! jq -e --arg src "sources/github/${GITHUB_REPOSITORY}" \
     '.sources // [] | map(.name) | index($src)' <<<"$sources" >/dev/null; then
  echo "ERROR: ${GITHUB_REPOSITORY} is not connected to Jules."
  echo "Open https://jules.google.com, sign in, and connect this fork via the GitHub App, then re-run."
  exit 2
fi

# --- 5. Sync the fork with upstream ---------------------------------------------
sync_msg=$(gh api -X POST "repos/${GITHUB_REPOSITORY}/merge-upstream" -F branch=main 2>&1 \
  | jq -r '.message // .' 2>/dev/null || echo "sync check failed")
echo "upstream sync: ${sync_msg}"

# --- 6. Discovery ----------------------------------------------------------------
cat_id=$(graphql_file_request /dev/stdin '{"owner":"PrimeIntellect-ai","name":"prime-agent"}' \
  <<'Q' | jq -r '.data.repository.discussionCategories.nodes[] | select(.name == "Bug reports") | .id'
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussionCategories(first: 20) { nodes { id name } }
  }
}
Q
)
[ -n "$cat_id" ] || { echo "ERROR: Bug reports category not found upstream"; exit 1; }

discs=$(graphql_file_request /dev/stdin "{\"owner\":\"PrimeIntellect-ai\",\"name\":\"prime-agent\",\"categoryId\":\"$cat_id\"}" \
  <<'Q'
query($owner: String!, $name: String!, $categoryId: ID!) {
  repository(owner: $owner, name: $name) {
    discussions(first: 50, categoryId: $categoryId, states: OPEN,
                orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number title body url createdAt
        comments(last: 5) { nodes { author { login } body createdAt } }
      }
    }
  }
}
Q
)

pick() {
  if [ -n "$OVERRIDE_DISCUSSION" ]; then
    jq -r --argjson n "$OVERRIDE_DISCUSSION" \
      '[.data.repository.discussions.nodes[] | select(.number == $n)] | first // empty' <<<"$discs"
  else
    jq -c --argjson state "$state" \
      '[.data.repository.discussions.nodes[]
        | select((.number | tostring) as $num
                 | (($state.dispatched // {}) | has($num) | not)
                 and (($state.posted // {}) | has($num) | not))]
      | sort_by(.createdAt) | first // empty' <<<"$discs"
  fi
}

chosen=$(pick)
if [ -z "$chosen" ]; then
  echo "No unhandled open bug-report discussions found. Nothing to do."
  state_set "$state"
  exit 0
fi

num=$(jq -r .number <<<"$chosen")
title=$(jq -r .title <<<"$chosen")
url=$(jq -r .url <<<"$chosen")
echo "selected discussion #$num: $title"

# --- 7. Build prompt and dispatch -------------------------------------------------
body_file=$(mktemp); comments_file=$(mktemp); directives_file=$(mktemp); prompt_file=$(mktemp); payload_file=$(mktemp)
trap 'rm -f "$body_file" "$comments_file" "$directives_file" "$prompt_file" "$payload_file"' EXIT

jq -r '.body // "" | .[0:8000]' <<<"$chosen" > "$body_file"
jq -r '.comments.nodes // [] | map("[\(.author.login // "unknown") \(.createdAt // "")]: \(.body // "" | .[0:2000])") | join("\n\n")' <<<"$chosen" > "$comments_file"
touch "$directives_file"
[ -f .jules-loop/directives.md ] && cp .jules-loop/directives.md "$directives_file"

prompt_text=$(
  cat .jules-loop/prompt_template.txt
  printf '\n--- Bug report (upstream discussion %s) ---\nTitle: ' "$num"
  jq -r .title <<<"$chosen"
  printf 'URL: '
  jq -r .url <<<"$chosen"
  printf '\nBody:\n'
  cat "$body_file"
  printf '\n--- Recent comments on the report ---\n'
  cat "$comments_file"
  printf '\n--- Owner directives ---\n'
  cat "$directives_file"
)
printf '%s' "$prompt_text" > "$prompt_file"

jq -n \
  --rawfile prompt "$prompt_file" \
  --arg src "sources/github/${GITHUB_REPOSITORY}" \
  --arg title "Fix upstream bug: ${title}" \
  '{
    prompt: $prompt,
    sourceContext: { source: $src, githubRepoContext: { startingBranch: "main" } },
    requirePlanApproval: false,
    automationMode: "AUTO_CREATE_PR",
    title: $title
  }' > "$payload_file"

resp=$(jules_create_session "$payload_file")
session_name=$(jq -r '.name // empty' <<<"$resp")
if [ -z "$session_name" ]; then
  echo "ERROR: Jules API did not return a session:" >&2
  jq -r '.error.message // .' <<<"$resp" >&2
  exit 1
fi
session_id=${session_name##*/}
session_url=$(jq -r '.url // empty' <<<"$resp")
echo "dispatched Jules session $session_id ($session_url) for discussion #$num"

state=$(jq -c --arg n "$num" --arg sid "$session_id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg u "$session_url" \
  '.dispatched[$n] = {sessionId: $sid, ts: $ts, status: "dispatched", sessionUrl: $u}' <<<"$state")
state=$(state_prune <<<"$state")
state_set "$state"
echo "done"
