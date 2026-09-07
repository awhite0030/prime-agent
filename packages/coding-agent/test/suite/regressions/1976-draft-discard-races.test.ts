import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { AgentDaemon } from "../../../src/modes/daemon/daemon-mode.js";

test("draft discard guards against pending attaches", async () => {
	const socketDir = await mkdtemp(join(tmpdir(), "daemon-test-"));
	const socketPath = join(socketDir, "daemon.sock");

	const daemon = new AgentDaemon(socketPath, {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		defaultSessionConfig: { agentDir: socketDir, cwd: socketDir } as any,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		createRuntime: () => null as any,
	});

	// Mock required private properties instead of fully booting
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(daemon as any).sessions = new Map();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(daemon as any).options = { worker: false };

	const state = {
		activeSessionId: "test-session",
		clients: new Set(),
		pendingAttaches: 1,
		runtime: {
			metadata: { kind: "session" },
			session: {
				isBashRunning: false,
				isSessionActive: false,
				hasRunningRlmChildren: () => false,
			},
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(daemon as any).sessions.set(state.activeSessionId, state);

	// Test that isDiscardableDraft correctly guards against pending attaches
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const isDiscardable = (daemon as any).isDiscardableDraft(state);
	expect(isDiscardable).toBe(false);

	// Now remove pendingAttaches but leave empty draft
	state.pendingAttaches = 0;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(daemon as any).isEmptyDraftContent = () => true;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const isDiscardableNow = (daemon as any).isDiscardableDraft(state);
	expect(isDiscardableNow).toBe(true);

	await rm(socketDir, { recursive: true, force: true });
});
