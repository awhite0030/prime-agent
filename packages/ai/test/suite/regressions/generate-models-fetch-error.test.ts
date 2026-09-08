import { execSync } from "child_process";
import { unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, "../../../scripts/generate-models.ts");

test("generate-models handles empty responses and fetch failures appropriately", () => {
	const mockScriptPath = join(__dirname, "run-with-mock-fetch.cjs");
	writeFileSync(
		mockScriptPath,
		`
        global.fetch = async () => ({ json: async () => ({}) });
        import("file://" + process.argv[2]).catch(() => process.exit(1));
    `,
	);

	let error: any = null;
	try {
		// Run from project root essentially
		execSync(`npx tsx ${mockScriptPath} ${scriptPath}`, { stdio: "pipe" });
	} catch (e) {
		error = e;
	} finally {
		try {
			unlinkSync(mockScriptPath);
		} catch {}
	}

	expect(error).not.toBeNull();
	if (error) {
		expect(error.status).toBe(1);
		const output = (error.stderr?.toString() || "") + (error.stdout?.toString() || "");
		expect(output).toMatch(/models\.dev data is empty or invalid/);
	} else {
		expect(true).toBe(false);
	}
});
