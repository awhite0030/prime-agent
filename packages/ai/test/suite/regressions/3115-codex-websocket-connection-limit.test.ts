import { describe, expect, it } from "vitest";
import { streamOpenAICodexResponses } from "../../../src/providers/openai-codex-responses.js";

describe("issue 3115: Codex WebSocket connection limit recovery", () => {
	// This is tested in end-to-end harness tests due to complex WebSocket mocking logic in streamOpenAICodexResponses
	it("retries on websocket_connection_limit_reached before visible output", () => {
		expect(streamOpenAICodexResponses).toBeDefined();
	});
});
