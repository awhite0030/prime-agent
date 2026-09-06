import { mkdtempSync, type PathLike, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	renameSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		renameSync: mocks.renameSync,
	};
});

import {
	type RlmSubagentDisplayEntry,
	readRlmSubagentDisplayEntry,
	writeRlmSubagentDisplayEntry,
} from "../../../src/modes/daemon/rlm-subagent-display.js";

function makeEntry(sessionDir: string): RlmSubagentDisplayEntry {
	return {
		type: "rlm_subagent",
		childId: "sub-1234abcd",
		sessionName: "worker",
		sessionDir,
		sessionFile: join(sessionDir, "01a0-child.jsonl"),
		rlmMaxDepth: 4,
		rlmParentNodeId: "sub-1234abcd",
		prompt: "do the work",
		spawnCode: "await rlm('do the work')",
		model: { provider: "test", modelId: "model" },
		status: "running",
		createdAt: 1,
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("RLM subagent display rename retry (regression 1935)", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "prime-rlm-display-rename-retry-"));
	});

	afterEach(() => {
		vi.clearAllMocks();
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("retries EPERM and succeeds before exhausting retries", async () => {
		const sessionDir = join(tempDir, "sub-1234abcd");
		const entry = makeEntry(sessionDir);

		const actualFs = await vi.importActual<typeof import("node:fs")>("node:fs");
		const originalRenameSync = actualFs.renameSync;

		let renameAttempts = 0;
		mocks.renameSync.mockImplementation((oldPath: PathLike, newPath: PathLike) => {
			renameAttempts++;
			if (renameAttempts < 3) {
				const err = new Error("operation not permitted") as NodeJS.ErrnoException;
				err.code = "EPERM";
				throw err;
			}
			return originalRenameSync(oldPath, newPath);
		});

		const start = Date.now();
		writeRlmSubagentDisplayEntry(entry);
		const elapsed = Date.now() - start;

		expect(renameAttempts).toBe(3);
		// 2 retries * 50ms = at least 100ms
		expect(elapsed).toBeGreaterThanOrEqual(100);

		const readEntry = await readRlmSubagentDisplayEntry(sessionDir);
		expect(readEntry).toEqual(entry);
	});

	it("retries up to 5 times and throws on the 6th EPERM attempt", () => {
		const sessionDir = join(tempDir, "sub-1234abcd");
		const entry = makeEntry(sessionDir);

		let renameAttempts = 0;
		mocks.renameSync.mockImplementation(() => {
			renameAttempts++;
			const err = new Error("operation not permitted") as NodeJS.ErrnoException;
			err.code = "EPERM";
			throw err;
		});

		const start = Date.now();
		let caughtError: unknown;
		try {
			writeRlmSubagentDisplayEntry(entry);
		} catch (error) {
			caughtError = error;
		}
		const elapsed = Date.now() - start;

		expect(caughtError).toBeDefined();
		expect((caughtError as NodeJS.ErrnoException).code).toBe("EPERM");
		expect(renameAttempts).toBe(6); // Initial + 5 retries
		// 5 retries * 50ms = at least 250ms
		expect(elapsed).toBeGreaterThanOrEqual(250);
	});

	it("does not retry on non-transient errors like ENOENT", () => {
		const sessionDir = join(tempDir, "sub-1234abcd");
		const entry = makeEntry(sessionDir);

		let renameAttempts = 0;
		mocks.renameSync.mockImplementation(() => {
			renameAttempts++;
			const err = new Error("no such file or directory") as NodeJS.ErrnoException;
			err.code = "ENOENT";
			throw err;
		});

		let caughtError: unknown;
		try {
			writeRlmSubagentDisplayEntry(entry);
		} catch (error) {
			caughtError = error;
		}

		expect(caughtError).toBeDefined();
		expect((caughtError as NodeJS.ErrnoException).code).toBe("ENOENT");
		expect(renameAttempts).toBe(1); // No retries
	});
});
