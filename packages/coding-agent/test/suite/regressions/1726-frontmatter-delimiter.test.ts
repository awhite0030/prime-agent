import { describe, expect, test } from "vitest";
import { parseFrontmatter } from "../../../src/utils/frontmatter.js";

describe("Frontmatter Delimiter Bug #1726", () => {
	test("should not end frontmatter on a line that starts with --- but has other characters", () => {
		const result = parseFrontmatter(`---
name: my-skill
description: "something"
"---foo": null
---

Body text`);

		expect(result.frontmatter).toEqual({
			name: "my-skill",
			description: "something",
			"---foo": null,
		});
		expect(result.body).toBe("Body text");
	});

	test("should end frontmatter on a line consisting solely of --- and optional whitespace", () => {
		const result = parseFrontmatter(`---
name: my-skill
description: "something"
---
Body text`);

		expect(result.frontmatter).toEqual({
			name: "my-skill",
			description: "something",
		});
		expect(result.body).toBe("Body text");
	});

	test("should handle missing frontmatter end gracefully", () => {
		const result = parseFrontmatter(`---
name: my-skill
description: "something"
"---foo": null
Body text`);

		expect(result.frontmatter).toEqual({});
		expect(result.body).toBe(`---
name: my-skill
description: "something"
"---foo": null
Body text`);
	});
});
