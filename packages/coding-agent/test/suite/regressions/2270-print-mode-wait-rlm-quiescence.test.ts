import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentSessionRuntime } from "../../../src/core/agent-session-runtime.js";
import { InProcessAgentConnection } from "../../../src/modes/agent-connection/in-process-agent-connection.js";
import { runPrintModeWithConnection } from "../../../src/modes/print-mode.js";
import { createHarness, type Harness } from "../harness.js";

describe("#2270 print mode rlm quiescence", () => {
	let parent: Harness | undefined;
	let child: Harness | undefined;

	afterEach(() => {
		child?.cleanup();
		parent?.cleanup();
		child = undefined;
		parent = undefined;
	});

	it("waits for spawned child completion using waitForRlmQuiescence", async () => {
		child = await createHarness();
		parent = await createHarness({
			serializedRefine: true,
			rlmDepth: 0,
			rlmMaxDepth: 1,
			subagentRuntimeHost: {
				createRlmSubagentRuntime: async () => ({ session: child!.session }),
				deleteRlmSubagentRuntime: async () => {},
			},
		});

		child.setResponses([fauxAssistantMessage("child completed")]);

		const mockRuntimeHost = {
			session: parent.session,
			onSessionInvalidated: () => ({ dispose: () => {} }),
			setRebindSession: () => {},
			dispose: async () => {},
		} as unknown as AgentSessionRuntime;

		const connection = new InProcessAgentConnection(mockRuntimeHost);
		const originalWaitForHeadlessCompletion = connection.waitForHeadlessCompletion.bind(connection);

		let passedOptions: any;
		connection.waitForHeadlessCompletion = async (options) => {
			passedOptions = options;
			return originalWaitForHeadlessCompletion(options);
		};

		parent.setResponses([fauxAssistantMessage("parent consumed the child result")]);

		const printModePromise = runPrintModeWithConnection(connection, {
			mode: "text",
			initialMessage: "spawn a child",
		});

		const exitCode = await printModePromise;
		expect(exitCode).toBe(0);

		expect(passedOptions).toEqual({ waitForRlmQuiescence: true });
	});
});
