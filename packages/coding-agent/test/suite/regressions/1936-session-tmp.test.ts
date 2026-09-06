import { join } from "node:path";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { createHarness } from "../harness.js";

describe("Regression #1936: session tmp directories", () => {
	it("should provide PRIME_AGENT_SESSION_TMP and other TMP variables to kernel and bash tools pointing to session-artifacts/tmp", async () => {
		const { createBashTool } = await import("../../../src/core/tools/bash.js");
		const { createIpythonTool } = await import("../../../src/core/tools/ipython.js");
		const harness = await createHarness({
			persistSession: true,
			tools: [createBashTool(process.cwd()), createIpythonTool(process.cwd())],
		});

		harness.setResponses([
			fauxAssistantMessage(
				fauxToolCall("bash", {
					command: "echo $PRIME_AGENT_SESSION_TMP && echo $TMP && echo $TEMP && echo $TMPDIR",
				}),
			),
			fauxAssistantMessage(
				fauxToolCall("ipython", {
					code: "import os\nprint(os.environ.get('PRIME_AGENT_SESSION_TMP'))\nprint(os.environ.get('TMP'))\nprint(os.environ.get('TEMP'))\nprint(os.environ.get('TMPDIR'))",
				}),
			),
			fauxAssistantMessage("Tested env vars."),
		]);

		const expectedTmpDir = join(harness.session.sessionManager.getSessionArtifactDir()!, "tmp");

		const bashOutput = await harness.session.executeBash(
			"echo $PRIME_AGENT_SESSION_TMP && echo $TMP && echo $TEMP && echo $TMPDIR",
		);

		expect(bashOutput.output).toBeDefined();
		const bashLines = bashOutput.output!.trim().split("\n");
		expect(bashLines[0]).toBe(expectedTmpDir);
		expect(bashLines[1]).toBe(expectedTmpDir);
		expect(bashLines[2]).toBe(expectedTmpDir);
		expect(bashLines[3]).toBe(expectedTmpDir);

		const promptPromise = harness.session.prompt("Check the TMP environment variables in python.");
		await promptPromise;

		const toolResults = harness.session.messages.filter((msg) => msg.role === "toolResult") as any[];
		const ipythonOutput = toolResults.find((msg) => msg.toolName === "ipython")?.content?.[0]?.text;
		expect(ipythonOutput).toBeDefined();
		const ipythonLines = ipythonOutput!.trim().split("\n");
		expect(ipythonLines[0]).toBe(expectedTmpDir);
		expect(ipythonLines[1]).toBe(expectedTmpDir);
		expect(ipythonLines[2]).toBe(expectedTmpDir);
		expect(ipythonLines[3]).toBe(expectedTmpDir);
	});
});
