1. **Define the Extension UI State Interface:**
   - In `packages/coding-agent/src/modes/daemon/active-session-state.ts`, define an interface `ActiveSessionExtensionUiState` to hold the widget, status, working message, hidden thinking label, and title state.
   - Add this `extensionUiState` property to the `ActiveSessionState` interface.
   - Initialize it when creating a new session or attaching if it doesn't exist.

2. **Update the State on UI Requests:**
   - In `packages/coding-agent/src/modes/daemon/daemon-extension-binding.ts`, update `createExtensionUIContext` so that whenever `emitUiRequest` is called for `setWidget`, `setStatus`, `setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, or `setTitle`, it also updates the corresponding value in `state.extensionUiState`.

3. **Replay the UI State on Client Attach:**
   - In `packages/coding-agent/src/modes/daemon/daemon-mode.ts` (specifically in the `attach` command handler), after sending the `session_attached` event, iterate through the preserved `extensionUiState`.
   - Re-emit synthetic UI requests (using `this.write(client, ...)` with a generated request id) for the preserved state to the newly attached client, ensuring they are sent *before* the first agent message update or after the initial state sync.

4. **Verify the Fix:**
   - Use the provided reproducer extension to ensure widgets rendered in `session_start` persist and are shown when the client attaches.
   - Run the tests.
   - Ensure the `pre_commit_instructions` are followed before creating the final PR.
