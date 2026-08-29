import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("issue #1707 npm prefix -g fallback", () => {
	it("install.sh does not use deprecated npm bin -g command", () => {
		const installShPath = join(__dirname, "../../../../../install.sh");
		const content = readFileSync(installShPath, "utf-8");
		expect(content).not.toMatch(/npm bin -g/);
		expect(content).toMatch(/npm prefix -g/);
	});
});
