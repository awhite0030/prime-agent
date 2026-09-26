import { expect, test } from "vitest";
import { IpythonKernelProvisioner } from "../../../src/core/tools/ipython.js";
import { createHarness } from "../harness.js";

test("python kernel bash() sees managed binaries in PATH", async () => {
	const harness = await createHarness();
	try {
		const p = new IpythonKernelProvisioner(process.cwd());
		const m = await p.ensure(() => {}, undefined);
		const r = await m.execute("r = await bash('echo $PATH'); print(r.output)", {});
		expect(r.stdout).toMatch(/\.prime\/agent\/bin/);
		await p.kill();
	} finally {
		harness.cleanup();
	}
});
