import { describe, expect, it } from "vitest";
import { streamAnthropic } from "../../../src/providers/anthropic.js";
import type { Context, Model } from "../../../src/types.js";

describe("Anthropic streaming provider", () => {
	it("should break out of reader.read() hang when aborted", async () => {
		const model: Model<"anthropic-messages"> = {
			id: "claude-3-opus-20240229",
			provider: "anthropic",
			api: "anthropic-messages",
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			maxTokens: 4096,
			name: "Claude 3 Opus",
			baseUrl: "",
			reasoning: false,
			input: [],
			contextWindow: 200000,
		};

		const context: Context = {
			systemPrompt: "You are a helpful assistant.",
			messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }], timestamp: Date.now() }],
		};

		const stream = new ReadableStream({
			start(controller) {
				controller.enqueue(
					new TextEncoder().encode(
						'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","content":[],"model":"claude-3","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":1}}}\n\n',
					),
				);
				// Purposefully hang here forever (no more enqueues, no close)
			},
		});

		// Inject mock client using stream as the response body
		const MockClient = class {
			messages = {
				create: () => ({
					asResponse: async () => ({
						status: 200,
						headers: new Headers(),
						body: stream,
					}),
				}),
			};
		};
		const client = new MockClient() as any;

		const ac = new AbortController();

		// Start stream
		const response = streamAnthropic(model, context, { client, signal: ac.signal });

		let gotStart = false;
		// A timeout to abort it
		const abortTimeout = setTimeout(() => ac.abort(), 100);

		const p = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Test timed out (hang not prevented)")), 1000);
			(async () => {
				try {
					for await (const event of response) {
						if (event.type === "start") {
							gotStart = true;
						} else if (event.type === "error") {
							expect(event.error.stopReason).toBe("aborted");
						}
					}
					clearTimeout(timeout);
					resolve();
				} catch (e: any) {
					clearTimeout(timeout);
					if (e.name === "AbortError" || e.message === "Request was aborted") {
						resolve();
					} else {
						reject(e);
					}
				}
			})();
		});

		await p;
		clearTimeout(abortTimeout);

		expect(gotStart).toBe(true);
	});
});
