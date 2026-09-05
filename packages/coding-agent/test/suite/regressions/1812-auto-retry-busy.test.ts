import { AgentContinueError } from "@earendil-works/pi-agent-core";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import { sleep } from "../../../src/utils/sleep.js";
import { createHarness, type Harness } from "../harness.js";

describe("issue #1812 auto-retry leaves isRetrying stuck on AgentContinueError", () => {
	let harness: Harness | undefined;

	afterEach(() => {
		harness?.cleanup();
		harness = undefined;
	});

	it("auto-retry clears isRetrying when agent.continue() throws busy", async () => {
		harness = await createHarness();
		const session = harness.session;

		// Enable auto-retry
		session.settingsManager.getRetrySettings = () => ({
			enabled: true,
			maxRetries: 3,
			baseDelayMs: 1,
		});

		let firstErrorSwallowed = false;

		// Mock continue on the agent to throw an error like busy
		const originalContinue = session.agent.continue.bind(session.agent);
		session.agent.continue = async () => {
			if (!firstErrorSwallowed) {
				firstErrorSwallowed = true;
				throw new AgentContinueError("busy", "mock busy error");
			}
			return originalContinue();
		};

		// Make provider throw a transient error to trigger auto-retry
		harness.setResponses([
			() => {
				throw new Error("Transient error");
			},
			fauxAssistantMessage("success"),
		]);
		// force the error to be considered retryable
		(session as any)._isRetryableError = () => true;

		void session.prompt("Hello");

		// Wait for retry to run and the agent to catch the busy error
		await sleep(50);

		// Check if it's still stuck in retrying
		expect(session.isRetrying).toBe(false);
	});
});
