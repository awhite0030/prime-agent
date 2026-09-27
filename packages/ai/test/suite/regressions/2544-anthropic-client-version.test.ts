import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("issue #2544 anthropic client version", () => {
	it("reports a Claude Code client version >= 2.1.280 to unblock opus-5.5", async () => {
		const anthropicFile = fs.readFileSync("src/providers/anthropic.ts", "utf8");
		const match = anthropicFile.match(/claudeCodeVersion = "(\d+)\.(\d+)\.(\d+)"/);
		expect(match).toBeDefined();

		if (match) {
			const [, majorStr, minorStr, patchStr] = match;
			const major = Number(majorStr);
			const minor = Number(minorStr);
			const patch = Number(patchStr);

			// Version must be at least 2.1.280
			const isNewer = major > 2 || (major === 2 && minor > 1) || (major === 2 && minor === 1 && patch >= 280);
			expect(isNewer).toBe(true);
		}
	});
});
