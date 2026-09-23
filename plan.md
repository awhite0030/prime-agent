# Plan

1. **Centralize Gemini Model Identification Helpers in `google-shared.ts`**
   - Update `getGeminiMajorVersion` regex from `/^gemini(?:-live)?-(\d+)/` to `/(?:^|\/|models\/)gemini(?:-live)?-(\d+)/` to support prefix handling.
   - Add exported helpers: `isGemma4Model`, `isGemini3ProModel`, `isGemini3FlashModel`, `isGemini3FlashLiteModel`, `isGeminiThinkingLevelModel`.
   - Update the signature of `getDisabledThinkingConfig` and move it to `google-shared.ts`.
   - Create a unified `getGoogleThinkingLevel(effort, modelId)` helper and export it from `google-shared.ts`.

2. **Refactor `google.ts` and `google-vertex.ts` to use Centralized Helpers**
   - Import `isGemini3ProModel`, `isGemini3FlashModel`, `isGemma4Model`, `getDisabledThinkingConfig`, and `getGoogleThinkingLevel` from `google-shared.ts`.
   - Replace redundant code (`getDisabledThinkingConfig`, `getThinkingLevel`, `getGemini3ThinkingLevel`, etc.) with calls to the shared helpers.
   - Update `streamSimpleGoogle` and `streamSimpleGoogleVertex` to use `getGoogleThinkingLevel`.

3. **Verify and Update Tests**
   - Create `packages/ai/test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts` to verify the fix works for Gemini 3 Flash Thinking disable and level setting via vertex AI models.
   - Run tests: `npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts` from `packages/ai`.

4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run `npm run check`.
   - Run `pre_commit_instructions` tool to perform required pre-commit checks.

5. **Submit**
   - Stage modified files (`packages/ai/src/providers/google-shared.ts`, `packages/ai/src/providers/google.ts`, `packages/ai/src/providers/google-vertex.ts`, and test).
   - Commit with Conventional Commits.
   - Use `submit` to push and wrap up.
