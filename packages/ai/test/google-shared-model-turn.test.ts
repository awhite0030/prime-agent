import { describe, expect, it } from "vitest";
import { convertMessages } from "../src/providers/google-shared.js";
import type { Context, Model } from "../src/types.js";

function makeGemini3Model<TApi extends "google-generative-ai" | "google-vertex">(
	api: TApi,
	provider: Model<TApi>["provider"],
	id = "gemini-3-pro-preview",
): Model<TApi> {
	return {
		id,
		name: "Gemini 3 Pro Preview",
		api,
		provider,
		baseUrl: "https://example.com",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
	};
}

describe("google-shared trailing model turn", () => {
	it("appends a user turn if the request ends with a model turn", () => {
		const model = makeGemini3Model("google-generative-ai", "google");
		const context: Context = {
			messages: [
				{ role: "user", content: "Hi", timestamp: 1 },
				{
					role: "assistant",
					content: [{ type: "text", text: "Hello there" }],
					api: "google-generative-ai",
					provider: "google",
					model: "gemini-3-pro-preview",
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "stop",
					timestamp: 2,
				},
			],
		};

		const contents = convertMessages(model, context);
		expect(contents.length).toBe(3);
		expect(contents[0].role).toBe("user");
		expect(contents[1].role).toBe("model");
		expect(contents[2].role).toBe("user");
		expect(contents[2].parts?.[0]?.text).toBe("Please continue.");
	});
});
