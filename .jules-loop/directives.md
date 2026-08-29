# Owner directives for the Jules loop

This file is appended verbatim to every task prompt. Edit it, commit, and the
next loop run picks the changes up — this is how you steer the agent.

- Prefer bug reports that clearly describe a reproduction path.
- Keep fixes minimal; style-only refactors are not wanted.
- If the report is stale or already fixed on current main, end the session
  without changing code and say so in the summary.
- Do not touch `packages/ai/src/models.generated.ts` (see AGENTS.md).
