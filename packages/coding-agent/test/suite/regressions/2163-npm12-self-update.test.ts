import { describe, expect, it } from "vitest";
import { getSelfUpdateCommandForMethod } from "../../../src/config.js";

describe("issue #2163 self-update npm 12 allow-remote", () => {
	it("adds allow-remote and allow-scripts to env for direct package artifacts", () => {
		const artifactUrl =
			"https://github.com/PrimeIntellect-ai/prime-agent/releases/download/v0.9.4/prime-agent-0.9.4.tgz";
		const command = getSelfUpdateCommandForMethod("npm", "prime-agent", artifactUrl, ["npm"], "prime-agent");

		expect(command).toBeDefined();
		if (!command) throw new Error("Expected command to be defined");

		// For an update where package name matches, the command itself is the install step
		const installStep = command.steps ? command.steps[0] : command;

		expect(installStep.env).toBeDefined();
		expect(installStep.env).toEqual({
			npm_config_allow_remote: "all",
			npm_config_allow_scripts: artifactUrl,
		});
	});

	it("does not add env for registry specs", () => {
		const command = getSelfUpdateCommandForMethod("npm", "prime-agent", "prime-agent@latest", ["npm"], "prime-agent");

		expect(command).toBeDefined();
		if (!command) throw new Error("Expected command to be defined");

		const installStep = command.steps ? command.steps[0] : command;
		expect(installStep.env).toBeUndefined();
	});
});
