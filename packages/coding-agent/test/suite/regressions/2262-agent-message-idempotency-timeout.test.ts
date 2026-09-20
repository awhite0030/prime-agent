import { describe, expect, it } from "vitest";

describe("Agent message delivery: unbounded waits and idempotency (issue 2262)", () => {
	it("deduplicates identical message_id retries without executing them twice", async () => {
		const { AgentDaemon } = await import("../../../src/modes/daemon/daemon-mode.js");
		const daemon = Object.create(AgentDaemon.prototype);
		daemon.recentAgentMessages = new Map();
		daemon.sessions = new Map();
		daemon.closingSessions = new Set();
		daemon.agentMessagesPaused = false;

		const payload = {
			id: "test-idempotent-123",
			source: "agent_message",
			target: { sessionId: "target-session", activeSessionId: "target-active", name: "target-name" },
			from: { sessionId: "sender-session", activeSessionId: "sender-active", name: "sender-name" },
			fromRelationship: "sibling",
			message: "hello",
		} as any;

		const targetState = {
			activeSessionId: "target-session",
			runtime: {
				session: {
					sessionId: "target-session",
					acceptAgentMessagePrompt: async (_content: string, options: any) => {
						options.preflightResult?.(true, false);
						options.admissionCommitted?.();
					},
				},
			},
		} as any;

		daemon.sessions.set("target-session", targetState);

		const result1 = await daemon.acceptAgentSessionMessage(targetState, payload);
		expect(result1.status).toBe("delivered");

		expect(daemon.recentAgentMessages.get("test-idempotent-123")).toBe("delivered");

		const targetStateFail = {
			activeSessionId: "target-session",
			runtime: {
				session: {
					sessionId: "target-session",
					acceptAgentMessagePrompt: async () => {
						throw new Error("Should not be called twice!");
					},
				},
			},
		} as any;

		const result2 = await daemon.acceptAgentSessionMessage(targetStateFail, payload);
		expect(result2.status).toBe("delivered");
	});
});
