import { expect, test } from "vitest";
import { normalizeOutliers } from "../../../scripts/generate-models.js";
import type { Model } from "../../../src/types.js";

test("normalizeOutliers caps cross-provider catalog limits to prevent extreme outliers", () => {
	const allModels: Model<any>[] = [
		{
			id: "moonshotai/kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "openrouter",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
			maxTokens: 4096, // Outlier
		},
		{
			id: "kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "moonshotai",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
			maxTokens: 262144,
		},
		{
			id: "kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "huggingface",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
			maxTokens: 262144,
		},
		{
			id: "moonshotai/kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "prime-inference",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
			maxTokens: 65535, // Not outlier (median 65535)
		},
		{
			id: "kimi-k2.5",
			name: "Kimi K2.5",
			api: "openai-completions",
			provider: "opencode",
			baseUrl: "",
			reasoning: true,
			input: ["text"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 262144,
			maxTokens: 65536,
		},
	];

	normalizeOutliers(allModels);

	for (const model of allModels) {
		expect(model.maxTokens).toBeGreaterThanOrEqual(65535 / 4);
		expect(model.maxTokens).toBeLessThanOrEqual(65536 * 4);
		expect(model.contextWindow).toBe(262144);
	}
});
