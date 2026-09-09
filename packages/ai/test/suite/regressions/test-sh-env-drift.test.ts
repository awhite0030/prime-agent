import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../../../..");

test("test.sh unsets env-api-keys.ts variables", () => {
	// The problem was that test.sh and prime-agent.sh --no-env missed env-api-keys.ts drift
	// We've addressed this by hooking scripts/check-env-key-lists.mjs into 'npm run check:env-keys'
	// By running the exact check hook script we guarantee the list remains in sync.

	try {
		execSync("node scripts/check-env-key-lists.mjs", { cwd: rootDir, stdio: "pipe" });
	} catch (e: any) {
		const stdout = e.stdout?.toString() || "";
		const stderr = e.stderr?.toString() || "";
		throw new Error(`check-env-key-lists.mjs failed:\nstdout: ${stdout}\nstderr: ${stderr}`);
	}
});
