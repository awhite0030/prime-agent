import { describe, expect, it } from "vitest";
import type { ExtensionAPI } from "../../../src/index.js";
import { createHarness } from "../harness.js";

describe("985-tool-call-extension-throw", () => {
	it("does not abort remaining extension handlers when one throws", async () => {
		let secondHandlerRan = false;
		let emittedError: any;

		const harness = await createHarness({
			extensionFactories: [
				{
					path: "thrower.js",
					factory: async (api: ExtensionAPI) => {
						api.on("tool_call", () => {
							throw new Error("I am a broken extension");
						});
					},
				},
				{
					path: "survivor.js",
					factory: async (api: ExtensionAPI) => {
						api.on("tool_call", () => {
							secondHandlerRan = true;
							return undefined;
						});
					},
				},
			],
		});

		(harness.session as any)._extensionRunner.onError((err: any) => {
			emittedError = err;
		});

		// Trigger a fake tool call emit
		await (harness.session as any)._extensionRunner.emitToolCall({
			type: "tool_call",
			toolCallId: "call_123",
			name: "some_tool",
			args: {},
		});

		expect(secondHandlerRan).toBe(true);
		expect(emittedError).toBeDefined();
		expect(emittedError.error).toBe("I am a broken extension");
		expect(emittedError.extensionPath).toBe("thrower.js");
		expect(emittedError.event).toBe("tool_call");
	});
});
