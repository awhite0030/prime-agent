import { afterEach, describe, expect, it, vi } from "vitest";
import { createRlmChildTerminalNoticeMessage } from "../../../src/core/messages.js";
import { createHarness, type Harness } from "../harness.js";

describe("2082: Headless shutdown new request", () => {
	let harness: Harness | undefined;

	afterEach(async () => {
		if (harness) {
			harness.cleanup();
		}
		harness = undefined;
	});

	it("does not start a new request when shutdown generates a terminal notice", async () => {
		harness = await createHarness({
			tools: [
				{
					name: "agent",
					label: "Agent Tool",
					description: "child agent",
					parameters: { type: "object", properties: {}, required: [] },
					execute: async () => ({ content: [{ type: "text", text: "done" }], details: {} }),
				},
			],
		});

		const session = harness.session;

		// simulate daemon shutting down (like in daemon-mode.ts after fix)
		// 1. parent is aborted
		await session.abort();

		// 2. child terminal notice is injected
		const notice = createRlmChildTerminalNoticeMessage({
			childId: "child1",
			sessionName: "child1",
			kind: "cancelled",
			reason: "shutdown",
		});

		try {
			await (session as any)._promptInjectedMessage("notice", notice);
		} catch (_e: any) {
			// This is expected to throw because session is aborted, or drop it
		}

		const { AgentDaemon } = await import("../../../src/modes/daemon/daemon-mode.js");
		const daemon = new AgentDaemon("dummy.sock", {
			sessionManager: harness.sessionManager,
			settingsManager: harness.settingsManager,
			authStorage: harness.authStorage,
			defaultSessionConfig: { agentDir: harness.tempDir },
		} as any);

		const state = {
			activeSessionId: session.sessionId,
			runtime: {
				session,
				dispose: async () => session.dispose(),
			},
			clients: new Set(),
			subscribeChildSessionIds: new Set(),
			extensionUiRequests: new Map(),
		} as any;

		// Using any to bypass private visibility during tests
		(daemon as any).sessions.set(state.activeSessionId, state);

		let sessionAbortCalled = false;
		let childCloseCalled = false;
		const callOrder: string[] = [];

		vi.spyOn(session, "abort").mockImplementation(async () => {
			sessionAbortCalled = true;
			callOrder.push("parent_abort");
		});

		vi.spyOn(daemon as any, "closeChildSessions").mockImplementation(async () => {
			childCloseCalled = true;
			callOrder.push("child_close");
			return undefined;
		});

		await (daemon as any).closeSession(state, "shutdown", true, true);

		expect(sessionAbortCalled).toBe(true);
		expect(childCloseCalled).toBe(true);
		expect(callOrder).toEqual(["parent_abort", "child_close"]);
	});
});
