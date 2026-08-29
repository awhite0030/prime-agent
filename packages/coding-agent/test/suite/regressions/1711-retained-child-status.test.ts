import { fauxAssistantMessage } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import type {
	AgentSessionMessageAgentSummary,
	AgentSessionMessageController,
} from "../../../src/core/agent-messages.js";
import { waitForHeadlessCompletion } from "../../../src/modes/headless-completion.js";
import { createHarness, type Harness } from "../harness.js";

describe("rlm.list_subagents status mismatch", () => {
	let parent: Harness | undefined;

	afterEach(() => {
		parent?.cleanup();
		parent = undefined;
	});

	it("reports a retained child as running while handling a follow-up", async () => {
		// biome-ignore lint/style/useConst: mocked push
		let children: AgentSessionMessageAgentSummary[] = [];
		const fakeMessageController: AgentSessionMessageController = {
			roster: async () => ({
				current: { name: "parent", id: "parent-id", depth: 0 },
				entries: [],
			}),
			listAgents: async () => ({
				current: {
					activeSessionId: "parent-id",
					sessionId: "parent-id",
					sessionName: "parent",
					runtimeKind: "headless" as any,
				},
				agents: children,
			}),
			sendAgentMessage: async (options) => {
				const match = children.find((c) => `child:${c.sessionName}` === options.target);
				if (!match) throw new Error("not found");
				return {
					id: "1",
					source: "agent_message" as any,
					target: {
						activeSessionId: match.activeSessionId,
						sessionId: match.sessionId!,
						sessionName: match.sessionName!,
						runtimeKind: match.runtimeKind,
					},
					message: options.message,
					deliveryStatus: "delivered",
				};
			},
		};

		parent = await createHarness({
			agentMessageController: fakeMessageController,
		});

		// Ensure we don't block waiting for model input
		parent.setResponses([
			fauxAssistantMessage("READY"),
			fauxAssistantMessage("DONE"), // for the follow up
		]);

		// Start child
		const admission = await parent.session.runRlmChild("Reply READY.", {
			name: "delete-race-repro",
		});

		const childSession = parent.session.getRlmChildSession(admission.rlm_child_id)!;

		// Wait for headless completion of child
		await waitForHeadlessCompletion(childSession);

		children.push({
			activeSessionId: "child-id",
			sessionId: "child-id",
			sessionName: "delete-race-repro",
			runtimeKind: "subagent",
			cwd: "/",
			isStreaming: false,
			unfinishedActionCount: 0,
			parentActiveSessionId: "parent-id",
			rlmChildId: admission.rlm_child_id,
			status: "idle",
			rlmChildRegistryStatus: "completed",
			sessionDir: "/tmp",
		});

		// At this point, the child is finished its first request.
		// We simulate the supervisor's registry saying it is now active again
		children[0].rlmChildRegistryStatus = "completed"; // it stays completed on the registry if not explicitly updated
		children[0].status = "running"; // but its activeSessionState says it is running (working)

		// Check the status
		const list = await parent.session.listRlmSubagents();
		const listed = list.subagents.find((x) => x.rlm_child_id === admission.rlm_child_id);

		expect(listed).toBeDefined();
		expect(listed?.status).toBe("running");

		childSession.abort();
	});
});
