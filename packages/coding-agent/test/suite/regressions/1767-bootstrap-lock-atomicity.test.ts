import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { acquireBootstrapLock, bootstrapLockDir } from "../../../src/core/kernel/bootstrap.js";

describe("Bootstrap Lock Atomicity (Bug #1767)", () => {
	let testVenvDir: string;
	let lockDir: string;

	beforeEach(async () => {
		testVenvDir = join(tmpdir(), `test-bootstrap-lock-${randomUUID()}`, "venv");
		lockDir = bootstrapLockDir(testVenvDir);
		await mkdir(join(testVenvDir, ".."), { recursive: true });
	});

	afterEach(async () => {
		await rm(join(testVenvDir, ".."), { recursive: true, force: true }).catch(() => {});
	});

	test("concurrent acquires of a stale lock only let one through while others wait", async () => {
		// Create a stale lock (simulating a dead PID)
		await mkdir(lockDir, { recursive: true });
		// Use a dummy PID that isn't running. PID 999999 is very unlikely to be running.
		// Actually, just creating a lock dir and waiting enough time for it to be stale
		// without a PID (BOOTSTRAP_LOCK_STALE_WITHOUT_PID_MS = 2000) is another option,
		// but putting a dead PID is faster because it reclaims immediately.
		const deadPid = 9999999;
		await writeFile(join(lockDir, "pid"), `${deadPid}\n`);

		let acquiredCount = 0;
		let runningOperations = 0;

		const acquireAndHold = async () => {
			runningOperations++;
			const release = await acquireBootstrapLock(testVenvDir);
			acquiredCount++;

			// Hold it for a little bit to ensure overlap
			await sleep(100);

			await release();
			runningOperations--;
		};

		// Start 5 concurrent acquisition attempts
		const tasks = Array.from({ length: 5 }, () => acquireAndHold());

		// Wait a short moment. The first one should acquire it, and the others should be waiting.
		await sleep(50);

		// At this point, EXACTLY ONE should have acquired the lock, and all 5 should be running Operations.
		expect(acquiredCount).toBe(1);
		expect(runningOperations).toBe(5);

		// A candidate or stale directory might be lingering for a fraction of a millisecond but
		// the point is no two acquire it simultaneously.

		// Wait for all to finish
		await Promise.all(tasks);

		// Total acquired count should be 5 over time (since each releases it)
		expect(acquiredCount).toBe(5);
		expect(runningOperations).toBe(0);

		// Lock dir should be gone at the end
		expect(existsSync(lockDir)).toBe(false);
	});
});
