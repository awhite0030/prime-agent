import { expect, test } from "vitest";
import { createRpcExtensionUiBridge } from "../../../src/modes/rpc/rpc-extension-ui-context.js";

test("rpc extension bridge forwards widgetPlacement and setFooter", async () => {
	const requests: any[] = [];
	const bridge = createRpcExtensionUiBridge((request) => {
		requests.push(request);
	});

	bridge.uiContext.setWidget("test-key", ["hello"], { placement: "belowEditor" });
	expect(requests[0].method).toBe("setWidget");
	expect(requests[0].widgetKey).toBe("test-key");
	expect(requests[0].widgetPlacement).toBe("belowEditor");

	bridge.uiContext.setFooter(() => ({}) as any);
	expect(requests[1].method).toBe("notify");
	expect(requests[1].notifyType).toBe("warning");
});

test("rpc extension bridge rejects component factory widgets and initializes theme", async () => {
	const requests: any[] = [];
	const bridge = createRpcExtensionUiBridge((request) => {
		requests.push(request);
	});

	// #2065: setWidget silently dropped component factories
	bridge.uiContext.setWidget("test-key", (() => {}) as any);
	expect(requests[0].method).toBe("notify");
	expect(requests[0].notifyType).toBe("warning");
	expect(requests[0].message).toContain("not supported");

	// #2065: theme was uninitialized in workers
	expect(() => bridge.uiContext.theme.fg("accent", "text")).not.toThrow();
});
