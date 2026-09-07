import { describe, it } from "vitest";
import { createHarness } from "../harness.js";

describe("agent-session-passive-rlm-child-release", () => {
	it("should properly release passive rlm child session", async () => {
		const harness = await createHarness();
		const session = harness.session;

		// Dummy child id
		const childId = "child-123";
		// Directly test the release method
		session.releasePassiveRlmChildSession(childId);

		// This confirms that calling it with a non-existent child doesn't crash
		// and safely does nothing.

		await session.disposeAsync();
	});
});
