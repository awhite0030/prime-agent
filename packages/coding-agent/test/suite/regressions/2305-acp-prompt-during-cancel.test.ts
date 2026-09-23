import * as acp from "@agentclientprotocol/sdk";
import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentSessionRuntime } from "../../../src/core/agent-session-runtime.js";
import { runAcpModeWithConnection } from "../../../src/modes/acp/index.js";
import { InProcessAgentConnection } from "../../../src/modes/agent-connection/in-process-agent-connection.js";
import { createHarness, type Harness } from "../harness.js";

function runtimeHostFor(session: unknown): AgentSessionRuntime {
	return {
		session,
		setRebindSession() {},
		setBeforeSessionInvalidate() {},
		async dispose() {},
	} as unknown as AgentSessionRuntime;
}

const harnesses: Harness[] = [];

afterEach(() => {
	for (const harness of harnesses.splice(0)) {
		harness.cleanup();
	}
});

describe("#2305 ACP prompt during cancel", () => {
	it("queues the follow-up prompt until the session is no longer cancelling", async () => {
		const harness = await createHarness();
		harnesses.push(harness);

		let resolveFirstTurn!: () => void;
		const firstTurnComplete = new Promise<void>((resolve) => {
			resolveFirstTurn = resolve;
		});

		harness.setResponses([
			async () => {
				await firstTurnComplete;
				return fauxAssistantMessage("first turn complete");
			},
			fauxAssistantMessage("second turn complete"),
		]);

		const connection = new InProcessAgentConnection(runtimeHostFor(harness.session));
		const toAgent = new TransformStream<Uint8Array, Uint8Array>();
		const toClient = new TransformStream<Uint8Array, Uint8Array>();
		void runAcpModeWithConnection(connection, {
			stream: acp.ndJsonStream(toClient.writable, toAgent.readable),
		});

		const handle = acp.client({ name: "issue-2305" }).connect(acp.ndJsonStream(toAgent.writable, toClient.readable));
		await handle.agent.request("initialize", { protocolVersion: acp.PROTOCOL_VERSION, clientCapabilities: {} });
		const created = await handle.agent.request("session/new", { cwd: process.cwd(), mcpServers: [] });
		const sessionId = created.sessionId;

		// 3. session/prompt (id=3) with a dummy text block; do not wait for it to finish.
		const prompt1Task = handle.agent.request("session/prompt", {
			sessionId,
			prompt: [{ type: "text", text: "first" }],
		});

		// wait briefly to ensure the turn starts
		await new Promise((r) => setTimeout(r, 50));

		// 4. Send session/cancel
		void handle.agent.notify("session/cancel", { sessionId });

		// 5. Immediately send a second session/prompt
		const prompt2Task = handle.agent.request("session/prompt", {
			sessionId,
			prompt: [{ type: "text", text: "second" }],
		});

		// Let the first turn resolve (so the cancellation can finish)
		resolveFirstTurn();

		// Both should now resolve, and neither should throw a JSON-RPC error.
		const res1 = await prompt1Task;
		expect(res1.stopReason).toBe("cancelled");

		const res2 = await prompt2Task;
		// Since we didn't cancel the second one, it finishes normally with endTurn stop reason or similar based on faux responses.
		expect(res2.stopReason).not.toBe("cancelled");
	});
});
