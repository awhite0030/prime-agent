import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DaemonSupervisor } from "../../../src/modes/daemon/daemon-supervisor.js";

// Helper to mock the worker routing for testing without real workers
interface SupervisorInternals {
	workers: Map<string, any>;
	handleCommand(client: object, command: Record<string, unknown>): Promise<unknown>;
}

describe("Live Session Rename Roster Update Regression", () => {
	it("should route rename_saved_session to the active worker and emit roster update", async () => {
		const directory = mkdtempSync(join(tmpdir(), "pi-supervisor-test-"));
		const supervisor = new DaemonSupervisor(join(directory, "daemon.sock"), {
			defaultSessionConfig: { agentDir: directory, cwd: directory },
			descriptorDir: join(directory, "workers"),
		}) as unknown as SupervisorInternals;

		// Mock roster entry that says the session is live in a worker
		const mockRosterEntry = {
			agentId: "test-agent",
			summary: {
				id: "test-session",
				sessionId: "test-session",
				activeSessionId: "test-active-session", // this makes it a live session
				sessionFile: join(directory, "test.jsonl"),
			},
		};

		const mockWorker = {
			descriptor: { workerId: "test-worker", connected: true },
			client: {
				request: vi.fn(async () => ({ status: "success", type: "rename_saved_session" })),
			},
			heartbeatSnapshot: [],
		};

		supervisor.workers.set("test-worker", mockWorker);

		// Mock supervisor functions to bypass real file system/workers
		Object.assign(supervisor, {
			roster: () => ({
				bySessionFile: () => mockRosterEntry,
			}),
			findWorkerForClient: vi.fn(async () => ({
				worker: mockWorker,
				summary: mockRosterEntry.summary,
			})),
			forwardToWorker: vi.fn(async (worker, command) => {
				return worker.client.request(command);
			}),
			savedSessionNameReservationInput: vi.fn(async (_sessionPath, name) => ({
				name,
				depth: 0,
			})),
			withSessionNameReservation: vi.fn(async (_target, cb) => cb()),
			assertSupervisorSavedSessionNameAvailable: vi.fn(async () => {}),
		});

		const client = { id: "client", attachedActiveSessionIds: new Set<string>() };

		// Test rename_saved_session WITHOUT activeSessionId in the command
		const command = {
			type: "rename_saved_session",
			sessionPath: mockRosterEntry.summary.sessionFile,
			name: "New Name",
			id: "cmd-1",
		};

		const result = await supervisor.handleCommand(client, command);

		// It should have forwarded to the active worker because the roster entry showed activeSessionId
		expect((supervisor as any).forwardToWorker).toHaveBeenCalledWith(mockWorker, {
			...command,
			activeSessionId: "test-active-session",
		});

		expect(result).toEqual({ status: "success", type: "rename_saved_session" });
	});
});
