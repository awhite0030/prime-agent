import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { execCommand } from "../../../src/core/exec.js";

describe("execCommand regressions", () => {
	it("truncates output when buffer size limit is exceeded", async () => {
		const testDir = mkdtempSync(join(tmpdir(), "prime-agent-exec-test-"));
		try {
			// Write a chatty command that outputs significantly more than maxBuffer to ensure multiple chunks
			// maxBuffer 1024, output ~ 128 * 1024 = 128KB
			const result = await execCommand(
				process.execPath,
				["-e", `for(let i=0; i<128; i++) process.stdout.write('x'.repeat(1024));`],
				testDir,
				{ maxBuffer: 1024 },
			);

			expect(result.truncated).toBe(true);
			// 128KB chars should be truncated, but depending on stream buffering, the resulting array could be a bit larger than maxBuffer
			// because we don't truncate partial chunks (if a single chunk is > maxBuffer, it is kept to avoid infinite loops).
			// We assert that it's bounded (much smaller than the full 128KB output).
			expect(result.stdout.length).toBeLessThan(100 * 1024);
			expect(result.stdout.length).toBeGreaterThan(0);
		} finally {
			rmSync(testDir, { recursive: true, force: true });
		}
	});
});
