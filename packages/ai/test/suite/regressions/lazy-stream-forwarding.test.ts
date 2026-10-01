import { describe, expect, it } from "vitest";
import { getApiProvider, setBedrockProviderModule } from "../../../src/index.js";
// Use inferred type for BedrockProviderModule
import type { AssistantMessage, AssistantMessageEvent } from "../../../src/types.js";

describe("lazy stream forwarding regression", () => {
	it("should forward a stream error correctly without an unhandled rejection", async () => {
		let throwRequested = false;

		// Mock BedrockProviderModule
		const brokenStream = async function* (): AsyncIterable<AssistantMessageEvent> {
			const partialMsg: AssistantMessage = {
				role: "assistant",
				content: [{ type: "text", text: "This is a partial message." }],
				api: "bedrock-converse-stream",
				provider: "amazon-bedrock",
				model: "anthropic.claude-3-sonnet-20240229-v1:0",
				usage: {
					input: 0,
					output: 0,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: 0,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "stop",
				timestamp: Date.now(),
			};

			yield { type: "start", partial: partialMsg };
			yield { type: "text_start", contentIndex: 0, partial: partialMsg };

			throwRequested = true;
			throw new Error("Simulated stream error");
		};

		const mockProviderModule: Parameters<typeof setBedrockProviderModule>[0] = {
			streamBedrock: brokenStream,
			streamSimpleBedrock: brokenStream as any, // Not strictly used for this test
		};

		// Inject the mock
		setBedrockProviderModule(mockProviderModule);

		const provider = getApiProvider("bedrock-converse-stream");
		expect(provider).toBeDefined();

		const stream = provider!.stream(
			{
				id: "anthropic.claude-3-sonnet-20240229-v1:0",
				name: "Claude 3 Sonnet",
				api: "bedrock-converse-stream",
				provider: "amazon-bedrock",
				contextWindow: 200000,
				maxTokens: 4096,
				baseUrl: "",
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				reasoning: false,
				input: ["text" as const],
			},
			{ messages: [] },
		);

		const events: AssistantMessageEvent[] = [];
		const resultPromise = stream.result();

		// Stream should give us the error event
		for await (const event of stream) {
			events.push(event);
		}

		expect(throwRequested).toBe(true);

		const resultMsg = await resultPromise; // We should not hang or crash here, but get the error result

		expect(events.length).toBeGreaterThan(0);
		const lastEvent = events[events.length - 1];

		expect(lastEvent.type).toBe("error");
		if (lastEvent.type === "error") {
			expect(lastEvent.error.stopReason).toBe("error");
			expect(lastEvent.error.errorMessage).toBe("Simulated stream error");
			expect(lastEvent.error.content).toEqual([{ type: "text", text: "This is a partial message." }]);
		}

		expect(resultMsg.stopReason).toBe("error");
		expect(resultMsg.errorMessage).toBe("Simulated stream error");
	});
});
