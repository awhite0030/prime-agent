import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnvPath, getKernelVenvDir } from "../../../src/core/kernel/bootstrap.js";

describe("bug #1811: Trim path env vars before resolving venv directories", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("getEnvPath should return undefined for missing, empty, or whitespace-only env vars", () => {
		delete process.env.TEST_VAR;
		expect(getEnvPath("TEST_VAR")).toBeUndefined();

		process.env.TEST_VAR = "";
		expect(getEnvPath("TEST_VAR")).toBeUndefined();

		process.env.TEST_VAR = "   ";
		expect(getEnvPath("TEST_VAR")).toBeUndefined();
	});

	it("getEnvPath should return trimmed value for valid string", () => {
		process.env.TEST_VAR = "  /some/path  ";
		expect(getEnvPath("TEST_VAR")).toBe("/some/path");
	});

	it("getKernelVenvDir falls back to default dir when PRIME_AGENT_KERNEL_VENV is whitespace", () => {
		process.env.PRIME_AGENT_KERNEL_VENV = "   ";
		const venvDir = getKernelVenvDir();
		const defaultDir = path.join(os.homedir(), ".prime", "agent", "kernel-venv");
		expect(venvDir).toBe(defaultDir);
	});

	it("getKernelVenvDir uses overridden path when valid", () => {
		process.env.PRIME_AGENT_KERNEL_VENV = "  /custom/venv/path  ";
		const venvDir = getKernelVenvDir();
		expect(venvDir).toBe(path.resolve("/custom/venv/path"));
	});
});
