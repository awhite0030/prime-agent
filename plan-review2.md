# Plan

1. **Centralize Gemini Model Identification Helpers in `google-shared.ts`**
   - I will use `run_in_bash_session` to run a Node.js `.cjs` script that reads `packages/ai/src/providers/google-shared.ts`, updates the `getGeminiMajorVersion` regex to `/(?:^|\/|models\/)gemini(?:-live)?-(\d+)/`, adds the exported helpers (`isGemma4Model`, `isGemini3ProModel`, `isGemini3FlashModel`, `isGemini3FlashLiteModel`, `isGeminiThinkingLevelModel`), and adds the `getDisabledThinkingConfig` and `getGoogleThinkingLevel` helpers. It will then write the updated content back to the file.

2. **Refactor `google.ts` and `google-vertex.ts` to use Centralized Helpers**
   - I will use `run_in_bash_session` to run Node.js `.cjs` scripts that read `packages/ai/src/providers/google.ts` and `packages/ai/src/providers/google-vertex.ts`. The scripts will add imports for the new helpers from `google-shared.ts`, remove the duplicated functions, and update the calls in `streamSimpleGoogle` and `streamSimpleGoogleVertex` and `buildParams` respectively. They will write the updated content back to the files.

3. **Verify modifications to the provider files**
   - I will use `run_in_bash_session` with `git diff` to review the modifications made to `google-shared.ts`, `google.ts`, and `google-vertex.ts` and confirm they were successful.

4. **Add Regression Test**
   - I will use `run_in_bash_session` with a `cat << 'EOF'` command to create `packages/ai/test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts`.

5. **Verify the test creation**
   - I will use `run_in_bash_session` with `cat packages/ai/test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts` to verify the test file was created correctly.

6. **Run Tests and Validation**
   - I will run `run_in_bash_session` to execute `npx tsx ../../node_modules/vitest/dist/cli.js --run test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts` from the `packages/ai` directory.
   - I will run `run_in_bash_session` to execute `npm run check` from the repository root to validate the code.

7. **Stage and Commit**
   - I will use `run_in_bash_session` to execute:
     `git add packages/ai/src/providers/google-shared.ts packages/ai/src/providers/google.ts packages/ai/src/providers/google-vertex.ts packages/ai/test/suite/regressions/google-vertex-gemini-3-flash-thinking.test.ts`
     `git commit -m "fix(ai): correct gemini 3 thinking config and model detection"`

8. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - I will run `pre_commit_instructions` tool and follow the returned instructions.

9. **Submit**
   - I will use the `submit` tool to submit the work.
