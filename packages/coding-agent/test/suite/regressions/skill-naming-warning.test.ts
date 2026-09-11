import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadSkillsFromDir } from "../../../src/core/skills.js";

describe("Skill naming warning (regression #2104)", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `prime-agent-skill-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	it("should load skill with colon in name but warn and suggest portable name", () => {
		const skillDir = join(testDir, "ui:design");
		mkdirSync(skillDir, { recursive: true });

		const skillContent = `---
name: ui:design
description: Minimal naming example.
---
Follow the user's design request.
`;
		writeFileSync(join(skillDir, "SKILL.md"), skillContent);

		const { skills, diagnostics } = loadSkillsFromDir({
			dir: testDir,
			source: "test",
		});

		expect(skills).toHaveLength(1);
		expect(skills[0].name).toBe("ui:design");

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].type).toBe("warning");
		expect(diagnostics[0].message).toContain("name contains invalid characters but was still loaded");
		expect(diagnostics[0].message).toContain('e.g. "ui-design"');
	});
});
