import { expect, test } from "vitest";
import { DAEMON_CLIENT_ENV_KEYS } from "../../../src/modes/daemon/daemon-protocol.js";

test("daemon protocol allowlists terminal dimensions", () => {
	// #2065: terminal width not available in daemon mode
	expect(DAEMON_CLIENT_ENV_KEYS).toContain("COLUMNS");
	expect(DAEMON_CLIENT_ENV_KEYS).toContain("LINES");
});
