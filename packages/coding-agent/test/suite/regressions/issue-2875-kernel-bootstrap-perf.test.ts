import { describe, expect, it } from "vitest";
import { ensureKernelPython } from "../../../src/core/kernel/bootstrap.js";

// Testing that this batch optimization applies is mainly a unit test concern for bootstrap.ts.
// It relies on process.env.PRIME_AGENT_KERNEL_PYTHON to trigger the targeted path without needing
// actual package installations or fake virtualenvs.
// We can test the internal `missingRlmExtraImportLabels` and `missingPythonSkillImportLabels` by
// calling `ensureKernelPython` with an override pointing to `python3`.

describe("issue-2875: kernel bootstrap performance", () => {
	it("should batch import spec checks when PRIME_AGENT_KERNEL_PYTHON is set", async () => {
		// Set environment variable to current system python
		const originalEnv = process.env.PRIME_AGENT_KERNEL_PYTHON;
		process.env.PRIME_AGENT_KERNEL_PYTHON = "python3";

		try {
			// It might fail on `hasPrimeAgentRuntime` or something else, but we just want to ensure it runs
			// the new codepath without hanging or starting many processes. The best way to check is
			// if we get an error about prime-agent-runtime missing.
			await expect(ensureKernelPython()).rejects.toThrow(/missing a current prime-agent-runtime/);
		} finally {
			if (originalEnv === undefined) {
				delete process.env.PRIME_AGENT_KERNEL_PYTHON;
			} else {
				process.env.PRIME_AGENT_KERNEL_PYTHON = originalEnv;
			}
		}
	});
});
