import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { getModel } from "../../../src/models.js";
import { streamAnthropic } from "../../../src/providers/anthropic.js";

function createSseResponse(events: Array<{ event: string; data: string }>): Response {
	const body = events.map(({ event, data }) => `event: ${event}\ndata: ${data}\n`).join("\n");
	return new Response(body, {
		status: 200,
		headers: { "content-type": "text/event-stream" },
	});
}

function createFakeAnthropicClient(response: Response): Anthropic {
	return {
		messages: {
			create: () => ({
				asResponse: async () => response,
			}),
		},
	} as unknown as Anthropic;
}

describe("Anthropic cache write cost bug", () => {
	it("recomputes cost in message_delta from the cache_creation object", async () => {
		const model = getModel("anthropic", "claude-haiku-4-5");

		// Simulate LiteLLM or similar proxy behavior where message_start gives some cache stats
		// and message_delta overrides them.
		const response = createSseResponse([
			{
				event: "message_start",
				data: JSON.stringify({
					type: "message_start",
					message: {
						id: "msg_test",
						usage: {
							input_tokens: 12,
							output_tokens: 0,
							cache_read_input_tokens: 0,
							cache_creation_input_tokens: 1000,
							// Proxy reported 5m tokens initially
							cache_creation: {
								ephemeral_5m_input_tokens: 1000,
								ephemeral_1h_input_tokens: 0,
							},
						},
					},
				}),
			},
			{
				event: "content_block_start",
				data: JSON.stringify({
					type: "content_block_start",
					index: 0,
					content_block: { type: "text", text: "" },
				}),
			},
			{
				event: "content_block_delta",
				data: JSON.stringify({
					type: "content_block_delta",
					index: 0,
					delta: { type: "text_delta", text: "Hello" },
				}),
			},
			{
				event: "content_block_stop",
				data: JSON.stringify({ type: "content_block_stop", index: 0 }),
			},
			{
				event: "message_delta",
				data: JSON.stringify({
					type: "message_delta",
					delta: { stop_reason: "end_turn" },
					usage: {
						input_tokens: 12,
						output_tokens: 5,
						cache_read_input_tokens: 0,
						cache_creation_input_tokens: 1000,
						// Proxy overrides it with 1h tokens in message_delta
						cache_creation: {
							ephemeral_5m_input_tokens: 0,
							ephemeral_1h_input_tokens: 1000,
						},
					},
				}),
			},
			{
				event: "message_stop",
				data: JSON.stringify({ type: "message_stop" }),
			},
		]);

		const result = await streamAnthropic(
			model,
			{ messages: [{ role: "user", content: "Say hello.", timestamp: Date.now() }] },
			{
				client: createFakeAnthropicClient(response),
				cacheRetention: "long", // Request 1-hour cache retention
			},
		).result();

		// Cost should be based on the 1-hour cache write cost multiplier (2.0)
		// Haiku 3.5 input cost is 0.001, so 1000 tokens * 2.0 = 0.002
		expect(result.usage.cacheWrite).toBe(1000);
		expect(result.usage.cost.cacheWrite).toBeCloseTo(0.002);
	});
});
