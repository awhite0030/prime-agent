import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isIgnoredInternalSocketPath } from "../../../src/cli/daemon-ps.js";
import { defaultDaemonSocketDir } from "../../../src/modes/daemon/daemon-socket.js";

describe("regression 1808: ignore legacy forkserver control sockets", () => {
	it("identifies daemon worker sockets as internal", () => {
		const dir = defaultDaemonSocketDir();
		expect(isIgnoredInternalSocketPath(join(dir, "worker-123.sock"))).toBe(true);
		expect(isIgnoredInternalSocketPath(join(dir, "worker-abc.sock"))).toBe(true);
		// False positives
		expect(isIgnoredInternalSocketPath(join(dir, "worker-123.txt"))).toBe(false);
		expect(isIgnoredInternalSocketPath(join(dir, "other-123.sock"))).toBe(false);
	});

	it("identifies legacy forkserver control sockets as internal", () => {
		const dir = defaultDaemonSocketDir();
		expect(isIgnoredInternalSocketPath(join(dir, "prime-agent-forkserver-123", "control.sock"))).toBe(true);
		expect(isIgnoredInternalSocketPath(join(dir, "prime-agent-forkserver-abc", "control.sock"))).toBe(true);
		// False positives
		expect(isIgnoredInternalSocketPath(join(dir, "prime-agent-forkserver-123", "other.sock"))).toBe(false);
		expect(isIgnoredInternalSocketPath(join(dir, "other-forkserver-123", "control.sock"))).toBe(false);
	});

	it("does not ignore main daemon sockets", () => {
		const dir = defaultDaemonSocketDir();
		expect(isIgnoredInternalSocketPath(join(dir, "daemon.sock"))).toBe(false);
		expect(isIgnoredInternalSocketPath(join(dir, "some-other-daemon-socket.sock"))).toBe(false);
	});
});
