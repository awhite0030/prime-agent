import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentSessionMessage } from "../../../src/core/agent-messages.js";
import { createHarness, getMessageText, getUserTexts, type Harness } from "../harness.js";

describe("ENG-1776 parent agent_message nudges can sit in child queue forever", () => {
	const harnesses: Harness[] = [];

	afterEach(() => {
		while (harnesses.length > 0) {
			harnesses.pop()?.cleanup();
		}
	});

	async function waitForDelivery(harness: Harness, expectedCalls: number): Promise<void> {
		await vi.waitFor(() => expect(harness.faux.state.callCount).toBe(expectedCalls));
		await harness.session.agent.waitForIdle();
		await vi.waitFor(() => expect(harness.session.queuedActionCount).toBe(0));
	}

	it("processes queued parent agent_messages after a turn completes", async () => {
		const harness = await createHarness();
		harnesses.push(harness);
		harness.setResponses([fauxAssistantMessage("long task complete"), fauxAssistantMessage("status reported")]);

		let queued = false;
		const unsubscribe = harness.session.agent.subscribe(async (event) => {
			if (event.type !== "agent_end" || queued) return;
			queued = true;

			const message = createAgentSessionMessage({
				id: "msg-1",
				target: { activeSessionId: harness.session.sessionId, sessionId: harness.session.sessionId },
				message: "please report status",
				source: "agent_message",
			});

			// acceptAgentMessagePrompt is how DaemonMode calls the child session
			await harness.session.acceptAgentMessagePrompt(message.content, {
				expandPromptTemplates: false,
				streamingBehavior: "steer",
				queueIfBusy: true,
				customMessage: message,
				resumeIfIdle: false, // daemon mode uses false
			});
		});

		await harness.session.prompt("do long task");
		await waitForDelivery(harness, 2);
		unsubscribe();

		const userTexts = getUserTexts(harness);
		const customTexts = harness.session.messages.filter((m) => m.role === "custom").map((m) => getMessageText(m));

		expect(userTexts[0]).toBe("do long task");
		expect(customTexts.some((text) => text && text.includes("please report status"))).toBe(true);

		expect(harness.eventsOfType("agent_start")).toHaveLength(2);
		expect(harness.eventsOfType("agent_end")).toHaveLength(2);
	});
});
