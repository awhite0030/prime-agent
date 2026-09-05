import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_AGENT_DIR, getDaemonLogPath } from "../../../src/config.js";
import { DaemonClient } from "../../../src/modes/daemon/daemon-client.js";

const cliPath = resolve(__dirname, "../../../src/cli.ts");
const tsxPath = resolve(__dirname, "../../../../../node_modules/tsx/dist/cli.mjs");
const tempDirs: string[] = [];
const children = new Set<ChildProcess>();

afterEach(async () => {
	for (const child of children) {
		if (child.exitCode === null && child.signalCode === null) {
			child.kill("SIGTERM");
		}
	}
	children.clear();
	for (const directory of tempDirs.splice(0)) {
		rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
	}
});

function tempDir(): string {
	const directory = mkdtempSync(join(tmpdir(), "prime-daemon-shutdown-log-test-"));
	tempDirs.push(directory);
	return directory;
}

function spawnSupervisor(agentDir: string, socketPath: string, cwd: string): ChildProcess {
	const child = spawn(
		process.execPath,
		[tsxPath, cliPath, "--mode", "daemon", "--daemon-socket", socketPath, "--offline"],
		{
			cwd,
			env: {
				...process.env,
				[ENV_AGENT_DIR]: agentDir,
				PI_OFFLINE: "1",
				TSX_TSCONFIG_PATH: resolve(__dirname, "../../../../../tsconfig.json"),
			},
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	children.add(child);
	return child;
}

async function connectEventually(socketPath: string, child?: ChildProcess): Promise<DaemonClient> {
	const deadline = Date.now() + 10000;
	let lastError: Error | undefined;
	while (Date.now() < deadline) {
		if (child && child.exitCode !== null) {
			throw new Error(`Child exited early with code ${child.exitCode}`);
		}
		const client = new DaemonClient(socketPath);
		try {
			await client.connect(500);
			return client;
		} catch (error) {
			lastError = error as Error;
			client.close();
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}
	throw lastError ?? new Error("connectEventually timeout");
}

describe("Daemon supervisor shutdown log", () => {
	it("logs received signal before terminating", async () => {
		const agentDir = tempDir();
		const projectDir = tempDir();
		const socketPath = join(tmpdir(), `prime-shutdown-test-${process.pid}-${randomUUID().slice(0, 8)}.sock`);

		// Ensure ENV_AGENT_DIR points to agentDir so getDaemonLogPath uses it
		process.env[ENV_AGENT_DIR] = agentDir;

		const child = spawnSupervisor(agentDir, socketPath, projectDir);
		const client = await connectEventually(socketPath, child);
		client.close();

		// Send SIGTERM to the daemon supervisor process
		child.kill("SIGTERM");

		// Wait for the child process to exit
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout waiting for child to exit")), 5000);
			child.on("exit", () => {
				clearTimeout(timeout);
				resolve();
			});
		});

		const logPath = getDaemonLogPath(socketPath);
		expect(existsSync(logPath)).toBe(true);

		const logContent = readFileSync(logPath, "utf8");
		expect(logContent).toContain("Received signal SIGTERM, initiating shutdown");
	});
});
