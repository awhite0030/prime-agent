import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("regression #1807: update documentation screenshots", () => {
	it("ensures the screenshots exist and have non-zero size", async () => {
		const imagesDir = path.join(__dirname, "../../../docs/images");

		const screenshots = ["interactive-mode.png", "tree-view.png", "doom-extension.png"];

		for (const filename of screenshots) {
			const filepath = path.join(imagesDir, filename);
			const stat = await fs.stat(filepath);
			expect(stat.size).toBeGreaterThan(0);
		}
	});
});
