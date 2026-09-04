import { test, expect } from "vitest";
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
