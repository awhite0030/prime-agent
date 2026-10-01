import { describe, expect, test } from "vitest";
import { createHarness } from "../harness.js";

describe("Regression #3163", () => {
	test("RPC client can resume the queue after an abort mid-tool-call", async () => {
		const harness = await createHarness();
		try {
			// Using harness directly is easier, since the bug actually affects agent-session's state
			// when _sessionInputPumpSuspended is true, and RPC prompt() doesn't set resumeIfIdle.

			let resolveFauxTool: (val: any) => void = () => {};
			const toolPromise = new Promise((resolve) => (resolveFauxTool = resolve));

			harness.setResponses([(() => toolPromise) as any, "OK"]);

			const promptPromise = harness.session.prompt("Start reading!", { streamingBehavior: "steer" });

			await new Promise((r) => setTimeout(r, 100));

			// Abort
			await harness.session.abort();

			resolveFauxTool({
				content: [{ type: "text", text: "done" }],
			});

			await promptPromise.catch(() => {});
			await harness.session.waitForIdle();

			// In RPC mode, a regular prompt corresponds to resumeIfIdle: false.
			await expect(harness.session.prompt("This should fail", { resumeIfIdle: false })).rejects.toThrow(
				"Cannot admit a session action while queued session input is suspended.",
			);

			// Now we resume the queue directly to emulate what resumeQueue() does
			harness.session.resumeQueuedWork();

			// The exact same prompt should now work
			const finalPrompt = harness.session.prompt("This should succeed", { resumeIfIdle: false });
			await harness.session.waitForIdle();
			await finalPrompt;
		} finally {
			await harness.cleanup();
		}
	});
});
