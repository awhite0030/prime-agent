import { expect, test } from "vitest";

function formatThrownValue(cause: unknown) {
	return String(cause);
}

class CodexProtocolError extends Error {
	constructor(msg: string, opts: any) {
		super(msg);
		Object.assign(this, opts);
	}
}

// Copy of parseSSE to test isolated implementation.
async function* parseSSE(response: Response): AsyncGenerator<Record<string, unknown>> {
	if (!response.body) return;

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			buffer = buffer.replace(/\r\n/g, "\n");

			let idx = buffer.indexOf("\n\n");
			while (idx !== -1) {
				const chunk = buffer.slice(0, idx);
				buffer = buffer.slice(idx + 2);

				const dataLines = chunk
					.split("\n")
					.filter((l) => l.startsWith("data:"))
					.map((l) => l.slice(5).trim());
				for (const data of dataLines) {
					if (data && data !== "[DONE]") {
						try {
							yield JSON.parse(data) as Record<string, unknown>;
						} catch (cause) {
							throw new CodexProtocolError(`Invalid Codex SSE JSON: ${formatThrownValue(cause)}`, {
								cause,
								payload: data,
							});
						}
					}
				}
				idx = buffer.indexOf("\n\n");
			}
		}

		buffer += decoder.decode();
		buffer = buffer.replace(/\r\n/g, "\n");
		if (buffer.trim()) {
			const dataLines = buffer
				.split("\n")
				.filter((l) => l.startsWith("data:"))
				.map((l) => l.slice(5).trim());
			for (const data of dataLines) {
				if (data && data !== "[DONE]") {
					try {
						yield JSON.parse(data) as Record<string, unknown>;
					} catch (cause) {
						throw new CodexProtocolError(`Invalid Codex SSE JSON: ${formatThrownValue(cause)}`, {
							cause,
							payload: data,
						});
					}
				}
			}
		}
	} finally {
		try {
			await reader.cancel();
		} catch {
			// The reader may already be closed.
		}
		try {
			reader.releaseLock();
		} catch {
			// Ignore.
		}
	}
}

test("parseSSE processes terminal events with missing newlines and CRLF", async () => {
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(new TextEncoder().encode('data: {"a": 1}\r\n\r\n'));
			controller.enqueue(new TextEncoder().encode('data: {"b": 2}\r\ndata: [DONE]'));
			controller.close();
		},
	});

	const response = new Response(stream);
	const events = [];
	for await (const event of parseSSE(response)) {
		events.push(event);
	}

	expect(events).toEqual([{ a: 1 }, { b: 2 }]);
});
