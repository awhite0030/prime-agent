import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lockSync } from "proper-lockfile";
import { describe, expect, it } from "vitest";
import { getHarnessStatePath, loadHarnessState, saveHarnessState } from "../../../src/core/refinement/refinement.js";

describe("Regression #2009 - Concurrent Python and TypeScript harness writes", () => {
	it("properly synchronizes harness writes and reads using proper-lockfile directories", async () => {
		const tempDir = mkdtempSync(join(tmpdir(), "prime-agent-test-2009-"));
		const harnessStateDir = join(tempDir, "harness");

		// Initialize state
		saveHarnessState(harnessStateDir, {
			schema: 1,
			entries: { memory: {}, skill: {}, subagent: {}, prompt: {} },
			refinements: [],
		});

		const statePath = getHarnessStatePath(harnessStateDir);
		expect(existsSync(statePath)).toBe(true);

		// Mock a cross-process lock being held by Python (a .lock directory)
		const releaseLock = lockSync(statePath, { retries: 0 });

		let lockTimedOut = false;
		try {
			// This should fail to acquire lock and gracefully return an empty state
			const emptyState = loadHarnessState(harnessStateDir);
			expect(emptyState.schema).toBe(1);
			expect(Object.keys(emptyState.entries.memory).length).toBe(0);
		} catch (_err) {
			lockTimedOut = true;
		} finally {
			releaseLock();
		}

		expect(lockTimedOut).toBe(false);

		// Unlocked read should succeed normally
		const state = loadHarnessState(harnessStateDir);
		expect(state.schema).toBe(1);
	});
});
