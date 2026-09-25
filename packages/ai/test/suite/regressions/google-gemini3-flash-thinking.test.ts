import { describe, expect, it, vi } from "vitest";
import { streamGoogle } from "../../../src/providers/google.js";
import type { Context, Model } from "../../../src/types.js";

describe("Google provider regression: Gemini 3 Flash disabled thinking", () => {
	it("should map disabled thinking for gemini-3.8-flash to LOW", async () => {
		const model: Model<"google-generative-ai"> = {
			id: "gemini-3.8-flash",
			provider: "google",
			api: "google-generative-ai",
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			maxTokens: 4096,
			name: "Gemini 3.8 Flash",
			baseUrl: "",
			reasoning: true,
			input: [],
			contextWindow: 200000,
		};

		const context: Context = {
			systemPrompt: "You are a helpful assistant.",
			messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }], timestamp: Date.now() }],
		};

		let interceptedBody: any = null;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn(async (_url, init) => {
			if (init?.body) {
				interceptedBody = JSON.parse(init.body as string);
			}
			return new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode("data: {}\n\n"));
						controller.close();
					},
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		}) as any;

		try {
			const stream = streamGoogle(model, context, { apiKey: "fake-key", thinking: { enabled: false } });
			for await (const event of stream) {
				if (event.type === "start") {
					break;
				}
			}
		} catch (_err) {
			// Ignore stream processing errors, we only care about the request payload
		} finally {
			globalThis.fetch = originalFetch;
		}

		expect(interceptedBody).toBeDefined();
		expect(interceptedBody.generationConfig?.thinkingConfig?.thinkingLevel).toBe("LOW");
	});
});
