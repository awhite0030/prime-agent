import { expect, test } from "vitest";
import { normalizeOutliers } from "../../../scripts/generate-models.js";
import type { Model } from "../../../src/types.js";

test("normalizeOutliers consistently populates thinkingLevelMap across providers", () => {
	const directProviderModel: Model<"openai-completions"> = {
		id: "kimi-k2.5",
		name: "Kimi K2.5",
		api: "openai-completions",
		provider: "moonshotai",
		baseUrl: "https://api.moonshot.ai/v1",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 128000,
	};

	const openRouterModel: Model<"openai-completions"> = {
		id: "moonshotai/kimi-k2.5",
		name: "MoonshotAI: Kimi K2.5",
		api: "openai-completions",
		provider: "openrouter",
		baseUrl: "https://openrouter.ai/api/v1",
		reasoning: true,
		thinkingLevelMap: {
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null,
		},
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 128000,
	};

	const models = [directProviderModel, openRouterModel];

	// Pre-condition: direct provider lacks thinkingLevelMap
	expect(directProviderModel.thinkingLevelMap).toBeUndefined();

	normalizeOutliers(models);

	// Post-condition: direct provider should have inherited the thinkingLevelMap
	const expectedMap = {
		minimal: null,
		low: null,
		medium: null,
		high: "high",
		xhigh: null,
		max: null,
	};

	expect(directProviderModel.thinkingLevelMap).toEqual(expectedMap);
	expect(openRouterModel.thinkingLevelMap).toEqual(expectedMap);
});
