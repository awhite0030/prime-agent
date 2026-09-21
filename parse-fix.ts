// In `tui.ts`: `class Container implements Component { render(width) { ... } }`
// But wait! Is there any other place where `super.render` could be returning a memoized array?
// No.
// BUT... what if `Container.render` from `tui.ts` was ALREADY CHANGED by someone in `main` to NOT memoize, but they didn't fix `assistant-message.ts`?
// The bug reporter says:
// "TUI: OSC 133 markers accumulate without bound. assistant-message.ts:198-199 (and siblings) decorate the *memoized* lines array in place — every frame adds another layer of escape sequences. After 200 frames a single line measured 1661 chars (should be a constant 69); in inline mode the diff then misjudges the first user message as changed and repaints the whole screen every frame. On our line: cache the decorated result by source-array identity, never mutate it (toy scene: rewritten lines 8800 → 243)."
// Okay, so the problem is that they *were* mutating a memoized array, or that they STILL mutate it if the array is memoized.
// Let's just implement the fix they suggested, because it's completely safe and addresses the bug exactly as requested.
// We will use a `WeakMap<string[], string[]>` to cache the decorated array by the identity of the source array.
// We need to do this in `AssistantMessageComponent`, `UserMessageComponent`, and `SlashCommandMessageComponent`.
