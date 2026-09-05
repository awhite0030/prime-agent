import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ENV_AGENT_DIR } from "../../../src/config.js";
import { acquireDaemonSupervisorOwnership } from "../../../src/modes/daemon/daemon-supervisor-ownership.js";

describe("Regression 4607: supervisor-owners registry honors PRIME_AGENT_CODING_AGENT_DIR", () => {
	let originalAgentDir: string | undefined;
	let isolatedAgentDir: string;
	let isolatedSocketPath: string;
	let expectedRegistryDir: string;

	beforeEach(() => {
		originalAgentDir = process.env[ENV_AGENT_DIR];

		const isolatedBase = realpathSync(tmpdir());
		isolatedAgentDir = join(
			isolatedBase,
			`prime-daemon-supervisor-test-${Math.random().toString(36).slice(2)}`,
			"agent",
		);
		isolatedSocketPath = join(dirname(isolatedAgentDir), "daemon.sock");
		expectedRegistryDir = join(dirname(isolatedAgentDir), "supervisor-owners");

		mkdirSync(isolatedAgentDir, { recursive: true });

		process.env[ENV_AGENT_DIR] = isolatedAgentDir;
	});

	afterEach(() => {
		if (originalAgentDir === undefined) {
			delete process.env[ENV_AGENT_DIR];
		} else {
			process.env[ENV_AGENT_DIR] = originalAgentDir;
		}
	});

	it("places the owner record in the isolated registry instead of the global one", async () => {
		const generation = "test-generation-123";
		const ownership = await acquireDaemonSupervisorOwnership({
			socketPath: isolatedSocketPath,
			descriptorDir: join(dirname(isolatedAgentDir), "descriptors"),
			agentDir: isolatedAgentDir,
			generation,
			appVersion: "1.0.0",
		});

		try {
			// Ensure it did not write to ~/.prime/supervisor-owners but to our expected path
			const ownerDirPath = join(expectedRegistryDir, `${generation}.owner`);
			expect(existsSync(ownerDirPath)).toBe(true);
			expect(existsSync(join(ownerDirPath, "owner.json"))).toBe(true);
		} finally {
			await ownership.release();
		}
	});
});
