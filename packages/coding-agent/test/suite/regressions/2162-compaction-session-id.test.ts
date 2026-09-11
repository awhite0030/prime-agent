import type { AssistantMessage, StreamOptions } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createHarness } from "../harness.js";

describe("Compaction sessionId propagation (regression)", () => {
	it("should pass the session ID to the provider when compacting", async () => {
		const harness = await createHarness({
			settings: {
				compaction: {
					enabled: true,
					reserveTokens: 10,
					keepRecentTokens: 5,
				},
			},
		});
		const session = harness.session;

		// Add some messages to trigger compaction
		for (let i = 0; i < 50; i++) {
			harness.sessionManager.appendMessage({
				role: "user",
				content: [
					{ type: "text", text: "Hello, this is a large message designed to trigger compaction. ".repeat(10) },
				],
				timestamp: Date.now(),
			});
			harness.sessionManager.appendMessage({
				role: "assistant",
				content: [{ type: "text", text: "I am a helpful assistant. ".repeat(10) }],
				timestamp: Date.now(),
				api: "faux",
				provider: "faux",
				model: "faux-1",
				stopReason: "stop",
				usage: { input: 10, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 20 },
			} as unknown as AssistantMessage);
		}

		let capturedOptions: StreamOptions | undefined;

		harness.setResponses([
			async (_context, streamOptions) => {
				capturedOptions = streamOptions;
				return {
					role: "assistant",
					stopReason: "stop",
					content: [{ type: "text", text: "Summary text" }],
					timestamp: Date.now(),
					api: "faux",
					provider: "faux",
					model: "faux-1",
					usage: { input: 10, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 20 },
				} as unknown as AssistantMessage;
			},
			async (_context, streamOptions) => {
				capturedOptions = streamOptions;
				return {
					role: "assistant",
					stopReason: "stop",
					content: [{ type: "text", text: "Turn prefix text" }],
					timestamp: Date.now(),
					api: "faux",
					provider: "faux",
					model: "faux-1",
					usage: { input: 10, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 20 },
				} as unknown as AssistantMessage;
			},
		]);

		// Run compaction manually
		await session.compact();

		expect(capturedOptions).toBeDefined();
		expect(capturedOptions?.sessionId).toBe(session.sessionId);
	});
});
