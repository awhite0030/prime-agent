// Fix: incremental parse throttle + encode once at stream end.
// We can throttle `parseStreamingJson`.
// But wait, the first defect was: "TUI: OSC 133 markers accumulate without bound. assistant-message.ts:198-199 (and siblings) decorate the *memoized* lines array in place..."
// I'm still trying to figure out how `AssistantMessageComponent` mutates the array.
// Look at `AssistantMessageComponent.render` again.
