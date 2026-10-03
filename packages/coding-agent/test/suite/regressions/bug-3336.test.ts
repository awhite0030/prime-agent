import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findCutPoint } from "../../../src/core/compaction/compaction.js";
import type { SessionEntry } from "../../../src/core/session-manager.js";
import { type Harness as AgentHarness, createHarness } from "../harness.js";

describe("bug-3336: Oversized custom messages trigger compaction but are omitted from cut-point sizing", () => {
	let harness: AgentHarness;

	beforeEach(async () => {
		harness = await createHarness();
	});

	afterEach(async () => {
		await harness.cleanup();
	});

	it("should correctly size oversized custom messages in findCutPoint", async () => {
		const customMessageContent = "x".repeat(480000); // 120,000 tokens

		// Setup entries manually to mimic a session
		const entries: SessionEntry[] = [
			{
				type: "message",
				id: "msg1",
				parentId: "head",
				timestamp: new Date().toISOString(),
				message: { role: "user", content: "seed" } as unknown as AgentMessage,
			},
			{
				type: "custom_message",
				id: "msg2",
				parentId: "msg1",
				timestamp: new Date().toISOString(),
				customType: "repro_context",
				content: customMessageContent,
				display: true,
			},
			{
				type: "message",
				id: "msg3",
				parentId: "msg2",
				timestamp: new Date().toISOString(),
				message: { role: "assistant", content: "ok" } as unknown as AgentMessage,
			},
		];

		const startIndex = 0;
		const endIndex = entries.length;
		const keepRecentTokens = 20000;

		const result = findCutPoint(entries, startIndex, endIndex, keepRecentTokens);

		// Before the fix, cutIndex was 0, meaning it skipped the custom message and couldn't find a cut point,
		// which lead to TooShort (no prefix/history to summarize).
		// After the fix, cutIndex should be 1, placing the cut boundary after the user message and before the large custom message.
		// Also it shouldn't be 0, otherwise firstKeptEntryIndex is 0 and it throws TooShort later.
		expect(result.firstKeptEntryIndex).toBe(1);
		expect(result.turnStartIndex).toBe(1); // turn 1 starts with the custom message / subsequent assistant
		expect(result.isSplitTurn).toBe(true);
	});
});
