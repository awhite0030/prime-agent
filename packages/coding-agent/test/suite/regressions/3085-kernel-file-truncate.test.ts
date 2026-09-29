import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ReplKernelManager } from "../../../src/core/kernel/index.js";

function resolveReplPython(): string | null {
	const candidates = [
		process.env.PRIME_AGENT_KERNEL_PYTHON,
		resolve(__dirname, "..", "..", "..", "..", "..", "prime-agent-runtime", ".venv", "bin", "python"),
		join(homedir(), ".prime", "agent", "kernel-venv", "bin", "python"),
	].filter((p): p is string => Boolean(p));
	for (const python of candidates) {
		if (!existsSync(python)) continue;
		const check = spawnSync(python, ["-c", "import rlm.repl, dill"], { encoding: "utf8" });
		if (check.status === 0) return python;
	}
	return null;
}

const python = resolveReplPython();
const describeIfKernel = python ? describe : describe.skip;

describeIfKernel("regression #3085: kernel file truncation", { tags: ["kernel-heavy"] }, () => {
	let dir = "";
	let snapshotPath = "";
	let manifestPath = "";

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), "prime-agent-repl-trunc-"));
		snapshotPath = join(dir, "session.dill");
		manifestPath = join(dir, "session.json");
	});

	afterAll(() => {
		if (dir) rmSync(dir, { recursive: true, force: true });
	});

	function newManager(): ReplKernelManager {
		return new ReplKernelManager({
			python: python as string,
			cwd: dir,
			snapshot: { path: snapshotPath, manifestPath },
		});
	}

	it("does not truncate user files on restore by leaving behind closed open-write handles", async () => {
		const writer = newManager();
		const testFile = join(dir, "victim.txt");
		const normalizedTestFile = testFile.replace(/\\/g, "\\\\");

		try {
			writeFileSync(testFile, "PRECIOUS".repeat(100));

			// Open file handle in write mode and close it, leaving variable `f` in namespace
			await writer.execute(`with open("${normalizedTestFile}", "w") as f:\n    f.write("x")`);

			const snap = await writer.snapshotState();
			expect(snap).not.toBeNull();
		} finally {
			await writer.shutdown({ snapshot: true, drainHostRequests: true });
		}

		// Write 8 bytes to the victim file manually (simulating edits between kernel restarts)
		writeFileSync(testFile, "SURVIVOR");
		expect(statSync(testFile).size).toBe(8);

		const reader = newManager();
		try {
			const _restore = await reader.restoreState();

			// Verify that the file size hasn't changed to 0 due to O_TRUNC from dill loads
			expect(statSync(testFile).size).toBe(8);
		} finally {
			await reader.shutdown({ snapshot: true, drainHostRequests: true });
		}
	}, 60_000);
});
