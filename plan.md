1. **Reproduce the issue**:
   - Write a unit test `packages/coding-agent/test/suite/regressions/2257-non-string-content.test.ts`.
   - We will mock the harness state load and format functions or just call them directly with a state that has `content` as an array.

2. **Fix the issue**:
   - In `packages/coding-agent/src/core/refinement/refinement.ts`, modify `loadHarnessState` to cast `entry.content` to a string if it isn't one already.
   - We will use the suggestion: `content: Array.isArray(entry.content) ? entry.content.join('\n') : (typeof entry.content === 'string' ? entry.content : String(entry.content ?? ""))`.
   - Also fix `compactText` and `overviewForPrompt` to coerce to string to be fully robust, or rely on `loadHarnessState` doing the coercion. Relying on `loadHarnessState` is better because it normalizes it at the source, but the issue description also points out two crash sites (one in `compactText`, one in `overviewForPrompt` inside `entry.content.replace`). Actually, `overviewForPrompt` handles `entry.content.replace`. Wait, the issue mentioned `:538` crash site 2 in the refiner's own view. If we coerce in `loadHarnessState`, it fixes both since `loadHarnessState` is used to load everything.

3. **Validate**:
   - Run the regression test.
   - Run `npm run check`.

4. **Pre-commit**:
   - Run `pre_commit_instructions` tool to do final verification, check, testing, review, reflection.

5. **Submit**:
   - Branch: `fix-harness-non-string-content`
   - PR description follows the required format.
