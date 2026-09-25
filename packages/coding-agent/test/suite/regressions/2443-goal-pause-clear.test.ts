import { expect, test } from "vitest";
import { createHarness } from "../harness.js";

test("goal pause and clear commands via host bridge", async () => {
	const harness = await createHarness();

	await harness.session.handleGoalHostRequest("goal.create", { objective: "do a thing" });
	expect(harness.session.goalState.status).toBe("active");

	await harness.session.handleGoalHostRequest("goal.pause");
	expect(harness.session.goalState.status).toBe("paused");

	await harness.session.handleGoalHostRequest("goal.clear");
	expect(harness.session.goalState.status).toBe("idle");
});
