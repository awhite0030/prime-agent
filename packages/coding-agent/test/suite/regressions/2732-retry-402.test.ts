import type { AssistantMessage } from "@earendil-works/pi-ai";
import { StreamFailureError } from "@earendil-works/pi-ai";
import { describe, expect, test } from "vitest";
import { createHarness } from "../harness.js";

describe("Regression 2732: HTTP 402 is not retried as transient", () => {
	test("AgentSession should fail immediately on HTTP 402 insufficient balance", async () => {
		const harness = await createHarness();
		try {
			const failFn = () => {
				throw new StreamFailureError("Insufficient balance", {
					kind: "auth",
					status: 402,
					providerErrorType: "insufficient_balance",
				});
			};
			harness.setResponses([failFn, failFn, failFn, failFn, failFn]);

			await harness.session.prompt("do something").catch((e) => e);
			await harness.session.waitForIdle();

			const errorResponses = harness.session.messages.filter(
				(m): m is AssistantMessage => m.role === "assistant" && m.stopReason === "error",
			);
			expect(errorResponses.length).toBeGreaterThan(0);

			const lastError = errorResponses[0];
			expect(lastError.errorMessage).toContain("Insufficient balance");
		} finally {
			await harness.cleanup();
		}
	});
});
