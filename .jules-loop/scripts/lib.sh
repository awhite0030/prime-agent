# Shared helpers for the Jules loop scripts. Source, do not execute.
# Requires env: GH_TOKEN (classic PAT with repo scope). JULES_API_KEY where noted.

STATE_VAR="JULES_STATE"
UPSTREAM_REPO="PrimeIntellect-ai/prime-agent"
JULES_API="https://jules.googleapis.com/v1alpha"

state_get() {
  gh api "repos/${GITHUB_REPOSITORY}/actions/variables/${STATE_VAR}" --jq .value 2>/dev/null \
    | jq -cS . 2>/dev/null || echo '{}'
}

# state_set "$json" — create or update the state variable, with retries.
state_set() {
  local json="$1" i
  for i in 1 2 3; do
    if gh api "repos/${GITHUB_REPOSITORY}/actions/variables/${STATE_VAR}" >/dev/null 2>&1; then
      if gh api -X PATCH "repos/${GITHUB_REPOSITORY}/actions/variables/${STATE_VAR}" \
           -f value="$json" >/dev/null 2>&1; then return 0; fi
    else
      if gh api -X POST "repos/${GITHUB_REPOSITORY}/actions/variables" \
           -f name="${STATE_VAR}" -f value="$json" >/dev/null 2>&1; then return 0; fi
    fi
    sleep $((i * 5))
  done
  echo "ERROR: could not persist ${STATE_VAR}" >&2
  return 1
}

# Prune old entries so the variable stays well under the 48 KB limit.
state_prune() {
  jq -cS '
    (.dispatched // {}) as $d |
    (.posted // {}) as $p |
    ($d | to_entries | sort_by(.value.ts // "") | reverse | .[0:200]) as $d2 |
    ($p | to_entries | sort_by(.value.ts // "") | reverse | .[0:200]) as $p2 |
    {dispatched: (reduce $d2[] as $e ({}; .[$e.key] = $e.value)),
     posted:     (reduce $p2[] as $e ({}; .[$e.key] = $e.value)),
     postDay:   (.postDay // ""), postCount: (.postCount // 0)}'
}

# GraphQL request built from files to keep untrusted text out of the shell.
# graphql_file_request "$query_file" "$json_variables"
graphql_file_request() {
  jq -n --rawfile q "$1" --argjson v "$2" '{query: $q, variables: $v}' \
    | gh api graphql --input -
}

# Count Jules sessions created in the last 24h.
jules_sessions_last_24h() {
  local cutoff
  cutoff=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
  curl -sS -H "X-Goog-Api-Key: ${JULES_API_KEY}" "${JULES_API}/sessions?pageSize=100" \
    | jq --arg c "$cutoff" '[.sessions // [] | .[] | select((.createTime // "") >= $c)] | length'
}

# Fetch one Jules session by id.
jules_get_session() {
  curl -sS -H "X-Goog-Api-Key: ${JULES_API_KEY}" "${JULES_API}/sessions/$1"
}

# Create a Jules session. $1 = JSON payload file.
jules_create_session() {
  curl -sS -X POST "${JULES_API}/sessions" \
    -H "X-Goog-Api-Key: ${JULES_API_KEY}" \
    -H "Content-Type: application/json" \
    --data-binary "@$1"
}
