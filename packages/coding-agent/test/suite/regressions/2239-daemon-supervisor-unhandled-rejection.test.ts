import { fork } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { expect, test } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test("2239: daemon supervisor unhandled rejection does not exit process", async () => {
	// Create a worker that initializes DaemonSupervisor and throws an unhandled rejection
	const script = `
        import { DaemonSupervisor } from "../../../src/modes/daemon/daemon-supervisor.ts";
		import { mkdtempSync } from "fs";
		import { tmpdir } from "os";
		import { join } from "path";

		const dir = mkdtempSync(join(tmpdir(), 'test-'));
        const socketPath = join(dir, "test.sock");

		const ds = new DaemonSupervisor(socketPath, {
			defaultSessionConfig: { agentDir: dir },
			descriptorDir: dir
		});

		Promise.reject(new Error("Test Unhandled Rejection"));

		setTimeout(() => {
			console.log("ALIVE");
			process.exit(0);
		}, 100);
    `;

	const { writeFileSync, unlinkSync } = await import("fs");
	const testFile = join(__dirname, "test-unhandled-run.ts");
	writeFileSync(testFile, script);

	// Run the script using tsx to support importing the TypeScript module
	const tsxPath = join(__dirname, "../../../../../node_modules/tsx/dist/cli.mjs");

	const result = await new Promise((resolve) => {
		const child = fork(tsxPath, [testFile], { stdio: "pipe" });
		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (d) => (stdout += d.toString()));
		child.stderr?.on("data", (d) => (stderr += d.toString()));
		child.on("exit", (code) => {
			resolve({ code, stdout, stderr });
		});
	});

	unlinkSync(testFile);

	const res = result as { code: number; stdout: string; stderr: string };
	expect(res.code).toBe(0);
	expect(res.stdout).toContain("ALIVE");
	// Ensure the custom handler logged the error. When we use console.error or similar inside the daemon log, it might not print directly, but we can verify it doesn't crash.
});
