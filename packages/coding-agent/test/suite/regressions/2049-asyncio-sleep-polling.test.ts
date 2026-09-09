import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

describe("2049 asyncio.sleep polling prompt rule", () => {
	test("System prompt includes asyncio.sleep and rlm_heartbeat guidance", () => {
		const promptPath = join(__dirname, "../../../src/core/prompts/rlm.ts");
		const content = readFileSync(promptPath, "utf-8");

		expect(content).toContain("`asyncio.sleep()` (including `await asyncio.sleep()`)");
		expect(content).toContain("If a wake-up is needed while work runs, create an RLM heartbeat");
	});
});
