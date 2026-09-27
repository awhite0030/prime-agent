import { describe, expect, it } from "vitest";
import { getCompat } from "../../../src/providers/openai-completions.js";
import type { Model } from "../../../src/types.js";

describe("OpenCode Affinity Headers", () => {
	it("detects sendSessionAffinityHeaders = true for opencode and opencode-go models explicitly generated with it", () => {
		// Mock generated model as if it came from models.generated.ts
		const opencodeModel: Model<"openai-completions"> = {
			id: "kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "opencode",
			baseUrl: "https://opencode.ai/zen/v1",
			reasoning: false,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 4096,
			maxTokens: 4096,
		};

		const compat = getCompat(opencodeModel);
		expect(compat.sendSessionAffinityHeaders).toBe(true);
	});
});
