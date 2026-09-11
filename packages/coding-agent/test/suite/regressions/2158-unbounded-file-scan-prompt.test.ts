import { expect, it } from "vitest";
import { buildSystemPrompt } from "../../../src/core/system-prompt.js";

it("includes guidance against unbounded file scans to prevent OOM (#2158)", () => {
	const prompt = buildSystemPrompt({
		cwd: "/test",
		messagesPath: "/test/messages",
		selectedTools: ["ipython"],
	});

	expect(prompt).toContain("Never run unbounded recursive file scans (e.g., `rglob('*')`) or eager bulk reads");
});
