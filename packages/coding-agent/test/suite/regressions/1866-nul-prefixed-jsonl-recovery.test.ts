import { appendFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadEntriesFromFileAsync } from "../../../src/core/session-manager.js";

const directories: string[] = [];
function tempDirectory(): string {
	const root = mkdtempSync(join(tmpdir(), "prime-agent-test-"));
	directories.push(root);
	return root;
}

afterEach(() => {
	for (const dir of directories) {
		rmSync(dir, { recursive: true, force: true });
	}
	directories.length = 0;
});

describe("issue #1866 NUL-prefixed JSONL recovery", () => {
	it("recovers NUL-prefixed records and issues visible diagnostics", async () => {
		const root = tempDirectory();
		const sessionPath = join(root, "session.jsonl");

		const validRecord = `{"type":"session","id":"test-1"}`;
		const validRecord2 = `{"type":"agent","message":{"id":"test-2","role":"user","content":"test after invalid"}}`;

		// 177 leading NUL bytes
		const nulPrefixedRecord =
			`\0`.repeat(177) +
			`{"type":"agent","message":{"id":"test-recovery","role":"user","content":"recovered valid"}}`;
		const malformedRecord = `{"type":"agent","mess`;
		const pureNulRecord = `\0`.repeat(178);

		const originalConsoleWarn = console.warn;
		const warnSpy = vi.fn();
		console.warn = warnSpy;

		try {
			// Append records manually, simulating journal corruption/recovery
			appendFileSync(
				sessionPath,
				`${validRecord}\n${validRecord2}\n${nulPrefixedRecord}\n${malformedRecord}\n${pureNulRecord}\n`,
			);

			const entries = await loadEntriesFromFileAsync(sessionPath);

			expect(entries).toBeDefined();
			// We should have the recovered message
			const recoveredMessage = entries.find((m: any) => m.message?.id === "test-recovery");
			expect(recoveredMessage).toBeDefined();
			expect((recoveredMessage as any)?.message?.content).toBe("recovered valid");

			// We should have valid records
			expect(entries.find((m: any) => m.type === "session")).toBeDefined();
			expect(entries.find((m: any) => m.message?.id === "test-2")).toBeDefined();

			// Verify warnings
			expect(warnSpy).toHaveBeenCalledWith("Recovered malformed JSONL record with 177 leading NUL bytes");
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Discarding malformed JSONL record:"));
			expect(warnSpy).toHaveBeenCalledWith("Discarding malformed JSONL record consisting only of 178 NUL bytes");
		} finally {
			console.warn = originalConsoleWarn;
		}
	});
});
