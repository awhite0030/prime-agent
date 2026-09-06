import { describe, expect, test } from "vitest";
import type { AgentConnectionSavedSessionInfo } from "../../../src/modes/agent-connection/index.js";
import { reconcileUnifiedSessions } from "../../../src/modes/agents-view/agents-view-state.js";
import { createHarness } from "../harness.js";

describe("Regression #1921: hidden draft rows", () => {
	function makeSavedSession(overrides: Partial<AgentConnectionSavedSessionInfo>): AgentConnectionSavedSessionInfo {
		return {
			id: "saved-id",
			path: "/saved.jsonl",
			cwd: "/cwd",
			created: new Date(),
			modified: new Date(),
			messageCount: 0,
			firstMessage: "",
			allMessagesText: "",
			...overrides,
		};
	}

	test("reconcileUnifiedSessions skips draft sessions from the saved catalog", async () => {
		const harness = await createHarness();
		expect(harness.session).toBeDefined();

		const draftSession = makeSavedSession({ messageCount: 0 });
		const liveSession = makeSavedSession({ id: "live-id", messageCount: 1 });

		const unified = reconcileUnifiedSessions([], [draftSession, liveSession]);

		expect(unified.length).toBe(1);
		expect(unified[0]!.saved?.id).toBe("live-id");
	});
});
