import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { expect, test } from "vitest";
import { createHarness } from "../harness.js";

test("agent auto-retries when the provider throws ETIMEDOUT (Codex inactivity timeout)", async () => {
	const harness = await createHarness({
		settings: { retry: { enabled: true, maxRetries: 3, baseDelayMs: 1 } },
	});
	try {
		const responses: FauxResponseStep[] = [
			() => {
				const error = new Error("Codex stream inactivity timeout after 300000ms");
				(error as any).code = "ETIMEDOUT";
				throw error;
			},
			fauxAssistantMessage("Recovered from inactivity timeout."),
		];
		harness.appendResponses(responses);

		await harness.session.prompt("test timeout");

		expect(harness.faux.state.callCount).toBe(2);
		const lastMessage = harness.session.messages[harness.session.messages.length - 1];
		if (lastMessage?.role === "assistant") {
			expect((lastMessage as any).content[0]).toEqual({ type: "text", text: "Recovered from inactivity timeout." });
		}
		expect(harness.eventsOfType("auto_retry_start").length).toBe(1);
		expect(harness.eventsOfType("auto_retry_end").length).toBe(1);
	} finally {
		harness.cleanup();
	}
});
