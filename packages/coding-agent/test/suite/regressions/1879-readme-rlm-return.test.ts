import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("issue #1879 README rlm return semantics", () => {
	it("README does not contradict docs on rlm return value", () => {
		const readmePath = join(__dirname, "../../../../../README.md");
		const content = readFileSync(readmePath, "utf-8");
		expect(content).not.toMatch(/returns their results programmatically/);
		expect(content).toMatch(
			/returns an admission handle immediately; their results arrive as `agent_message` replies/,
		);
	});
});
