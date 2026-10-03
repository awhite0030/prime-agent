import { describe, expect, it } from "vitest";
import { InteractiveMode } from "../../../src/modes/interactive/interactive-mode.js";

describe("3330-legacy-tui-compaction-loader", () => {
	it("retires compaction and retry loaders on idle snapshot resync", async () => {
		// Mock setup for InteractiveMode instance
		const mode = Object.create(InteractiveMode.prototype);
		mode.statusContainer = {
			clear: () => {},
			addChild: () => {},
			removeChild: () => {},
			children: [],
		};
		mode.ui = { requestRender: () => {} };

		mode.isAgentCompacting = () => false;
		mode.getRetryAttempt = () => 0;

		mode.autoCompactionLoader = { stop: () => {} };
		mode.retryLoader = { stop: () => {} };
		mode.retryCountdown = { dispose: () => {} };

		// Call the method directly
		mode.syncWorkingLoader();

		// Verify that they are now retired
		expect(mode.autoCompactionLoader).toBeUndefined();
		expect(mode.retryLoader).toBeUndefined();
		expect(mode.retryCountdown).toBeUndefined();
	});
});
