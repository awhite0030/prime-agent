import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kernelVenvPython } from "../../../src/core/kernel/bootstrap.js";
import { createHarness } from "../../suite/harness.js";

describe("Regression #2066: kernel venv python path", () => {
	it("resolves the venv python path per platform", async () => {
		const _harness = await createHarness();
		const venv = join("test", "kernel-venv");

		expect(kernelVenvPython(venv, "win32")).toBe(join(venv, "Scripts", "python.exe"));
		expect(kernelVenvPython(venv, "linux")).toBe(join(venv, "bin", "python"));
		expect(kernelVenvPython(venv, "darwin")).toBe(join(venv, "bin", "python"));
	});
});
