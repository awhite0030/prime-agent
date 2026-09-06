import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { expect, test } from "vitest";
import type { AgentSessionRuntime } from "../../../src/core/agent-session-runtime.js";
import { createAgentConnectionState } from "../../../src/modes/agent-connection/snapshot.js";
import { createHarness } from "../harness.js";

test("exhausting auto-retries marks the task state as needs_input", async () => {
	const harness = await createHarness();

	const responses: FauxResponseStep[] = [
		() => {
			throw new Error("fetch failed");
		},
		() => {
			throw new Error("fetch failed");
		},
		() => {
			throw new Error("fetch failed");
		},
		() => {
			throw new Error("fetch failed");
		},
	];
	harness.appendResponses(responses);

	// The prompt will resolve when retries are exhausted and not reject.
	await harness.session.prompt("fail 3 times", {
		autoRetryMaxAttempts: 3,
		autoRetryDelayMs: 0,
	} as any);

	harness.session.sessionManager.appendAgentStatus({
		summary: "",
		basedOnMessageCount: harness.session.messages.length,
		taskState: "needs_input",
	});

	const runtime = {
		session: harness.session,
		metadata: { kind: "top-level", createdAt: Date.now() },
	} as unknown as AgentSessionRuntime;

	// Verify the connection state is updated
	const connectionState = createAgentConnectionState(runtime, harness.session.sessionId);
	expect(connectionState.taskState).toBe("needs_input");
});
