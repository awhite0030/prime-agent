import type { ResponseStreamEvent } from "openai/resources/responses/responses.js";
import { expect, test } from "vitest";
import { processResponsesStream } from "../../../src/providers/openai-responses-shared.js";
import type { Model } from "../../../src/types.js";
import { EventStream } from "../../../src/utils/event-stream.js";

test("missing content_part.added on responses text delta", async () => {
	const mockModel: Model<"faux"> = {
		id: "mock",
		name: "Mock Model",
		api: "faux",
		provider: "faux",
		baseUrl: "https://example.com",
		reasoning: false,
		input: ["text"],
		contextWindow: 100,
		maxTokens: 100,
		cost: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
	};

	const events: ResponseStreamEvent[] = [
		{
			type: "response.created",
			response: { id: "test", status: "in_progress", output: [] } as any,
			sequence_number: 1,
		},
		{
			type: "response.output_item.added",
			item: {
				id: "item1",
				type: "message",
				role: "assistant",
				status: "in_progress",
				content: [],
			} as any,
			output_index: 0,
			sequence_number: 2,
		},
		{
			type: "response.output_text.delta",
			delta: "hello",
			output_index: 0,
			item_id: "item1",
			content_index: 0,
			sequence_number: 3,
			logprobs: null as any,
		},
		{
			type: "response.done" as any,
			response: { id: "test", status: "completed", output: [] } as any,
			sequence_number: 4,
		},
	];

	async function* getEvents(): AsyncGenerator<ResponseStreamEvent> {
		for (const e of events) yield e;
	}

	const output: any = { content: [] };
	const stream = new EventStream<any>(
		(e: any) => e.type === "stop",
		(_e: any) => output,
	);

	const streamPromise = processResponsesStream(getEvents(), output, stream as any, mockModel as any).then(() => {
		// Mock ending the stream manually when the stream completes.
		stream.push({ type: "stop" } as any);
	});

	const streamEvents = [];
	for await (const e of stream) {
		streamEvents.push(e);
	}
	await streamPromise;

	expect(output.content).toEqual([{ type: "text", text: "hello" }]);
});
