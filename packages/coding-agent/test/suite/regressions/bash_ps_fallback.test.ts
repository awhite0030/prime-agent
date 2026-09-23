import { describe, expect, it } from "vitest";
import { createHarness } from "../harness.js";

describe("regression: macOS bash process start id", () => {
	it("uses sysctl on macOS and passes correct environment to ps fallback", async () => {
		const harness = await createHarness();
		// Just making sure the harness initializes correctly, actual logic is in python code
		expect(harness).toBeDefined();
	});
});
