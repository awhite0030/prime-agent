import { mkdtempSync, rmSync } from "node:fs";
import type { Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DaemonSocketClient } from "../../../src/modes/daemon/active-session-state.js";
import { AgentDaemon } from "../../../src/modes/daemon/daemon-mode.js";
import { DaemonSupervisor } from "../../../src/modes/daemon/daemon-supervisor.js";

const directories: string[] = [];
function tempDirectory(): string {
	const root = mkdtempSync(join(tmpdir(), "prime-agent-test-"));
	directories.push(root);
	return root;
}

afterEach(() => {
	for (const dir of directories) {
		rmSync(dir, { recursive: true, force: true });
	}
	directories.length = 0;
});

function socketClient(id: string): DaemonSocketClient {
	const socket = new PassThrough() as unknown as Socket;
	socket.write = vi.fn().mockReturnValue(false); // Make write return false to simulate backpressure
	socket.destroy = vi.fn();
	Object.defineProperty(socket, "destroyed", { value: false });
	return {
		id,
		socket,
		attachedActiveSessionIds: new Set(),
		authenticated: true,
		backpressured: false,
		capabilities: new Set(),
		supportsExtensionUi: false,
		detachInput: () => undefined,
	};
}

describe("Lossless daemon terminal events (issue 1902)", () => {
	it("preserves terminal tool events on worker-daemon boundary when backpressured", async () => {
		const root = tempDirectory();
		const daemon = new AgentDaemon(join(root, "worker.sock"), {
			defaultSessionConfig: { agentDir: root, cwd: root },
			createRuntime: async () => {
				throw new Error("unexpected runtime creation");
			},
		});

		const client = socketClient("test-client");
		client.backpressured = true;
		client.snapshotActiveSessionIds = new Set(["test-session"]);

		const internals = daemon as unknown as {
			queueClientCatchup(client: DaemonSocketClient, activeSessionId: string, purpose: string): void;
			writeSerialized(client: DaemonSocketClient, payload: any, message: any): boolean;
			broadcastToSession(state: any, message: any): void;
		};
		internals.queueClientCatchup = vi.fn();
		internals.writeSerialized = vi.fn().mockReturnValue(true);

		const mockState = {
			activeSessionId: "test-session",
			clients: new Set([client]),
			runtime: { session: {} },
		};

		// Send tool_execution_end (in RECOVERY_CHECKPOINT_EVENTS)
		internals.broadcastToSession(mockState, {
			type: "session_event",
			activeSessionId: "test-session",
			event: {
				type: "tool_execution_end",
				toolCallId: "test-tool",
				toolName: "test-tool",
				result: { content: [] },
				isError: false,
			},
		});

		expect(internals.queueClientCatchup).not.toHaveBeenCalled();
		expect(internals.writeSerialized).toHaveBeenCalled();

		vi.clearAllMocks();

		// Send ordinary event (not in RECOVERY_CHECKPOINT_EVENTS)
		internals.broadcastToSession(mockState, {
			type: "session_event",
			activeSessionId: "test-session",
			event: {
				type: "message_update",
				messageId: "test",
			} as any,
		});

		expect(internals.queueClientCatchup).toHaveBeenCalled();
	});

	it("preserves terminal tool events on supervisor-client boundary when backpressured", async () => {
		const root = tempDirectory();
		const supervisor = new DaemonSupervisor(join(root, "supervisor.sock"), {
			defaultSessionConfig: { agentDir: root, cwd: root },
			descriptorDir: join(root, "state"),
		});

		const client = socketClient("test-client");
		client.attachedActiveSessionIds.add("test-session");
		client.snapshotActiveSessionIds = new Set(["test-session"]);
		client.backpressured = true;

		const internals = supervisor as unknown as {
			clients: Set<DaemonSocketClient>;
			queueCatchup(client: DaemonSocketClient, activeSessionId: string, purpose: string): void;
			writeSerialized(client: DaemonSocketClient, payload: any): boolean;
			handleWorkerFrame(worker: any, frame: any): void;
			invalidateWorkerSnapshot: any;
		};
		internals.clients.add(client);
		internals.queueCatchup = vi.fn();
		internals.writeSerialized = vi.fn();
		internals.invalidateWorkerSnapshot = vi.fn();

		const worker = {
			descriptor: { rootActiveSessionId: "other" },
			snapshotCache: new Map(),
			snapshotLoads: new Map(),
			transcriptCaches: new Map(),
		};

		const frame = {
			header: {
				kind: "outbound",
				outboundType: "session_event",
				activeSessionId: "test-session",
				sessionEventType: "tool_execution_end",
			},
			payload: Buffer.from("{}"),
		};

		internals.handleWorkerFrame(worker, frame);

		expect(internals.queueCatchup).not.toHaveBeenCalled();
		expect(internals.writeSerialized).toHaveBeenCalled();

		vi.clearAllMocks();

		const ordinaryFrame = {
			header: {
				kind: "outbound",
				outboundType: "session_event",
				activeSessionId: "test-session",
				sessionEventType: "message_update",
			},
			payload: Buffer.from("{}"),
		};
		internals.handleWorkerFrame(worker, ordinaryFrame);

		expect(internals.queueCatchup).toHaveBeenCalled();
	});
});
