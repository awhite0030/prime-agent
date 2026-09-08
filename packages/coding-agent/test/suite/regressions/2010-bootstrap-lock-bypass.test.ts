import { readFile } from "fs/promises";
import { describe, expect, it } from "vitest";
import { createHarness } from "../harness.js";

describe("2010-bootstrap-lock-bypass", () => {
	it("should invalidate the environment when the lockfile changes", async () => {
		const _harness = await createHarness();

		const { resolveRuntimeIdentity } = await import("../../../src/core/kernel/bootstrap.js");

		const firstIdentity = await resolveRuntimeIdentity();

		// Let's modify the lockfile in the prime-agent-runtime
		const uvLockPath = "../../prime-agent-runtime/uv.lock";
		const lockContent = await readFile(uvLockPath, "utf8");

		try {
			const fs = await import("fs/promises");
			await fs.appendFile(uvLockPath, "\n# regression test modification\n");

			const secondIdentity = await resolveRuntimeIdentity();

			expect(firstIdentity).not.toEqual(secondIdentity);
		} finally {
			// Restore
			const fs = await import("fs/promises");
			await fs.writeFile(uvLockPath, lockContent);
		}
	});
});
