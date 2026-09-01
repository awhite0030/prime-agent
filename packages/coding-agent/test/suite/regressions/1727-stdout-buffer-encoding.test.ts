import { afterEach, describe, expect, it, vi } from "vitest";
import { isStdoutTakenOver, restoreStdout, takeOverStdout } from "../../../src/core/output-guard.js";

describe("issue #1727 stdout output guard buffer encoding", () => {
	afterEach(() => {
		if (isStdoutTakenOver()) {
			restoreStdout();
		}
		vi.restoreAllMocks();
	});

	it("preserves Buffer chunks instead of flattening them to stringified decimal arrays", () => {
		const rawStderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		takeOverStdout();

		const testBuffer = Buffer.from("hello world");
		process.stdout.write(testBuffer);

		expect(rawStderrWriteSpy).toHaveBeenCalledTimes(1);
		expect(rawStderrWriteSpy.mock.calls[0][0]).toBe(testBuffer);
	});

	it("preserves string chunk and explicit encoding instead of discarding encoding", () => {
		const rawStderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

		takeOverStdout();

		const testString = "hÃ©llo";
		const testEncoding = "latin1";
		process.stdout.write(testString, testEncoding);

		expect(rawStderrWriteSpy).toHaveBeenCalledTimes(1);
		expect(rawStderrWriteSpy.mock.calls[0][0]).toBe(testString);
		expect(rawStderrWriteSpy.mock.calls[0][1]).toBe(testEncoding);
	});
});
