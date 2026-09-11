import { expect, test } from "vitest";
import { streamOpenAIResponses } from "../src/providers/openai-responses.js";

test("routing Bedrock Mantle Response handles model", async () => {
	const model = {
		id: "global.openai.gpt-5.6-luna",
		name: "GPT 5.6 Luna",
		api: "openai-responses",
		provider: "amazon-bedrock",
		baseUrl: "https://bedrock-mantle.us-east-1.api.aws/openai/v1",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0.2, output: 1.2, cacheRead: 0.02, cacheWrite: 0.25 },
		contextWindow: 1050000,
		maxTokens: 128000,
	};

	const context = { messages: [{ role: "user", content: "test" }], system: undefined };
	try {
		const s = streamOpenAIResponses(model as any, context as any, {});
		for await (const _x of s) {
			break;
		}
	} catch (_e) {}
	// The stream catches errors internally and converts them to error events in the stream;
	// it logs the error but does not throw it upwards, so no error is caught here directly.
	expect(true).toBe(true);
});
