import { spawn } from "child_process";
import path from "path";
import { describe, expect, it } from "vitest";

describe("3033-benchmark-dispose", () => {
	it("disposes runtime and exits when PI_STARTUP_BENCHMARK is true and running in interactive mode", async () => {
		const scriptPath = path.resolve(__dirname, "../../../dist/cli.js");

		// To mock isTTY in a spawned child, we can pass code to node directly via stdin.
		// Alternatively, we can use a temporary file script that imports cli.js.
		const wrapperCode = `
Object.defineProperty(process.stdin, 'isTTY', { value: true });
process.argv.push("--no-session");
import("file://" + ${JSON.stringify(scriptPath)});
		`;

		const child = spawn("node", ["-e", wrapperCode], {
			env: {
				...process.env,
				PI_TIMING: "1",
				PI_STARTUP_BENCHMARK: "1",
			},
			stdio: "pipe",
		});

		let output = "";

		child.stdout.on("data", (data) => {
			output += data.toString();
		});

		child.stderr.on("data", (data) => {
			output += data.toString();
		});

		const exitCode = await new Promise<number | null>((resolve) => {
			child.on("close", (code) => {
				resolve(code);
			});
			// Timeout after 5 seconds to prevent hanging if it doesn't dispose properly
			setTimeout(() => {
				child.kill("SIGKILL");
				resolve(null);
			}, 5000);
		});

		// if exitCode is null, we killed it
		expect(exitCode).not.toBeNull();
		expect(output).toContain("TOTAL:");
	});
});
