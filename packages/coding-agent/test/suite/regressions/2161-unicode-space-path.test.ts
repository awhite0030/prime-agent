import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../../../src/cli/args.js";
import { processFileArguments } from "../../../src/cli/file-processor.js";
import { createHarness } from "../harness.js";

describe("issue #2161 unicode space in @file attachment", () => {
	it("resolves literal Unicode space file paths correctly", async () => {
		const harness = await createHarness();
		const testDir = mkdtempSync(join(tmpdir(), "prime-agent-2161-"));

		try {
			// A file with a non-breaking space (U+00A0)
			const requestedName = "report draft.txt";
			const requestedPath = join(testDir, requestedName);
			writeFileSync(requestedPath, "INTENDED DOCUMENT");

			// A file with a normal space (U+0020)
			const normalName = "report draft.txt";
			const normalPath = join(testDir, normalName);
			writeFileSync(normalPath, "DIFFERENT DOCUMENT");

			// The core CLI logic uses current working directory for relative paths if we just pass a string without an absolute path.
			// But here we use absolute paths in the args because they are easier to trace.
			const parsed = parseArgs([`@${requestedPath}`]);

			// This matches the exact usage in the CLI entry point
			const result = await processFileArguments(parsed.fileArgs);

			// The text should contain INTENDED DOCUMENT and not DIFFERENT DOCUMENT
			expect(result.text).toContain("INTENDED DOCUMENT");
			expect(result.text).not.toContain("DIFFERENT DOCUMENT");

			// It should correctly output the exact filename too
			expect(result.text).toContain(requestedPath);
		} finally {
			rmSync(testDir, { recursive: true, force: true });
			await harness.session.disposeAsync();
		}
	});
});
