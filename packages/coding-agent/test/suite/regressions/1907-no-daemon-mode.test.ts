import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_AGENT_DIR } from "../../../src/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tsxPath = resolve(__dirname, "../../../../../node_modules/tsx/dist/cli.mjs");
const cliPath = resolve(__dirname, "../../../src/cli.ts");
const repoTsconfigPath = resolve(__dirname, "../../../../../tsconfig.json");

const tempRoots = new Set<string>();

const fauxExtensionPath = resolve(__dirname, "../../fixtures/eng-4600-faux-extension.ts");

async function runCli(
	args: string[],
	options: { agentDir: string; stdin?: string; environment?: NodeJS.ProcessEnv },
): Promise<{ code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string }> {
	const child = spawn(process.execPath, [tsxPath, cliPath, ...args], {
		env: {
			...process.env,
			TSX_TSCONFIG_PATH: repoTsconfigPath,
			[ENV_AGENT_DIR]: options.agentDir,
			PI_SKIP_VERSION_CHECK: "1",
			PRIME_AGENT_INTERNAL_LEGACY_OWNED_WORKER_FRONTEND: "0",
			...options.environment,
		},
		stdio: ["pipe", "pipe", "pipe"],
	});

	let stdout = "";
	let stderr = "";

	child.stdout.on("data", (chunk) => {
		stdout += chunk;
	});

	child.stderr.on("data", (chunk) => {
		stderr += chunk;
	});

	if (options.stdin) {
		child.stdin.write(options.stdin);
	}
	child.stdin.end();

	const [code, signal] = await new Promise<[number | null, NodeJS.Signals | null]>((resolve) =>
		child.on("exit", (code, signal) => resolve([code, signal])),
	);

	return { code, signal, stdout, stderr };
}

describe("1907: --no-daemon flag", () => {
	afterEach(() => {
		for (const root of tempRoots) {
			try {
				rmSync(root, { recursive: true, force: true });
			} catch {}
		}
		tempRoots.clear();
	});

	it("prevents daemon client usage when passed as a flag", async () => {
		const root = mkdtempSync(join(tmpdir(), "prime-agent-1907-"));
		tempRoots.add(root);
		const agentDir = join(root, "agent");
		const socketPath = join(root, "should-not-exist.sock");

		const result = await runCli(
			[
				"--mode",
				"acp",
				"--no-daemon",
				"--daemon-socket",
				socketPath,
				"--model",
				"faux/faux",
				"--extension",
				fauxExtensionPath,
				"--no-tools",
				"--no-skills",
				"--no-prompt-templates",
				"--no-themes",
				"--no-context-files",
			],
			{
				agentDir,
				stdin: '{"id":"initialize","type":"initialize"}\n{"id":"session","type":"session/new"}\n{"id":"close","type":"session/close"}\n',
			},
		);

		if (result.code !== 0) {
			console.error("STDOUT:", result.stdout);
			console.error("STDERR:", result.stderr);
		}
		expect(result).toMatchObject({ code: 0, signal: null });

		const { existsSync } = await import("node:fs");
		expect(existsSync(socketPath)).toBe(false);
	}, 30_000);
});
