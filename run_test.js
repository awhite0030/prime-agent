import { loadHarnessState, formatHarnessStateForPrompt } from './packages/coding-agent/src/core/refinement/refinement.ts';

const dummyState = {
  schema: 1,
  entries: {
    memory: {
      canary: {
        id: "canary",
        kind: "memory",
        title: "Canary memory",
        path: "general",
        scope: "global",
        content: ["Canary memory body text."],
        reference: {},
        arguments: {},
        metadata: {},
        source: "agent",
        version: 1
      }
    }
  },
  refinements: []
};

// Simulate loadHarnessState parsing it
const state = loadHarnessState(undefined, "global");
// Let's just create a raw one instead of relying on file system loading logic
const state2 = {
  schema: 1,
  entries: {
    memory: {
      canary: {
        id: "canary",
        kind: "memory",
        title: "Canary memory",
        path: "general",
        scope: "global",
        content: ["Canary memory body text."],
        reference: {},
        arguments: {},
        metadata: {},
        source: "agent",
        version: 1
      }
    }
  },
  refinements: []
};
try {
  formatHarnessStateForPrompt(state2);
} catch (err) {
  console.log("Caught:", err.message);
}
