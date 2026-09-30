import { describe, expect, it } from "vitest";
import { processResponsesStream } from "../../../src/providers/openai-responses-shared.js";
import type { Api, Model } from "../../../src/types.js";
import { AssistantMessageEventStream } from "../../../src/utils/event-stream.js";

describe("Usage normalization", () => {
	it("should not produce negative input or zero totalTokens for OpenAI responses", async () => {
		const stream = new AssistantMessageEventStream();
		const output: any = { content: [], usage: {} };
		const openaiStream = (async function* () {
			yield {
				type: "response.completed",
				response: {
					id: "resp_123",
					status: "completed",
					usage: {
						input_tokens: 10,
						output_tokens: 5,
						total_tokens: 35,
						input_tokens_details: { cached_tokens: 20 },
					},
				},
			} as any;
		})();

		const model: Model<any> = {
			id: "test-model",
			provider: "openai",
			api: "openai-responses" as Api,
			input: [],
			reasoning: false,
			contextWindow: 1000,
			maxTokens: 1000,
			name: "test-model",
			baseUrl: "https://api.openai.com/v1",
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		};

		await processResponsesStream(openaiStream, output, stream, model);

		expect(output.usage.input).toBe(0); // Clamped from -10
		expect(output.usage.totalTokens).toBe(25); // 0 + 5 + 20
	});
});
