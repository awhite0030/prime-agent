import { describe, expect, it } from "vitest";
import { KernelBusyAfterInterruptError } from "../../../src/core/kernel/shared.js";
import type { IpythonKernelProvisioner } from "../../../src/core/tools/ipython.js";
import * as ipythonTool from "../../../src/core/tools/ipython.js";

describe("Regression 2026: Subagent abandoned kernel", () => {
	it("disposes the provisioner when a kernel gets wedged and headless busy-cancel drops it", async () => {
		let kernelKilled = false;

		// Mock provisioner behavior
		const mockProvisioner = {
			ensure: async () => ({
				execute: async () => {
					throw new KernelBusyAfterInterruptError();
				},
			}),
			kill: async () => {
				kernelKilled = true;
			},
		} as unknown as IpythonKernelProvisioner;

		const toolDefWithMock = ipythonTool.createIpythonToolDefinition("/tmp", {
			provisioner: mockProvisioner,
		});

		// Run execute which internally triggers executeWithBusyKernelChoice
		try {
			await toolDefWithMock.execute(
				"tool_call_1",
				{ code: "re.search(r'(a+)+$', 'a' * 40 + 'b')" },
				undefined,
				undefined,
				{ hasUI: false } as any,
			);
		} catch (_e) {
			// expected to throw KernelBusyAfterInterruptError
		}

		expect(kernelKilled).toBe(true);
	});
});
