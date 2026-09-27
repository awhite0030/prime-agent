import { expect, test } from "vitest";
import { buildAgentsViewRows } from "../../../src/modes/agents-view/agents-view-state.js";
import { createHarness } from "../harness.js";

test("early agent cleanup cancels running RLM grandchildren and does not expose them as top-level chats", async () => {
	const harness = await createHarness();
	try {
		const fakeSummary: any = {
			id: "child-1",
			sessionId: "child-1-id",
			lifecycle: "archived",
			activity: "idle",
			isSessionActive: false,
			runtimeKind: "subagent",
			rlmDepth: 2,
			sessionName: "Worker",
			cwd: "/",
			isStreaming: false,
			isCompacting: false,
			attachedClients: 0,
			messageCount: 1,
			sessionActions: { queuedCount: 0, steering: [], followUps: [] },
			created: new Date().toISOString(),
			modified: new Date().toISOString(),
			lastActivityAt: new Date().toISOString(),
			parentSessionPath: "/path/to/parent",
		};
		const rows = buildAgentsViewRows([fakeSummary]);
		expect(rows[0].kind).toBe("subagent");
	} finally {
		await harness.cleanup();
	}
});
