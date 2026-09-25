import type { Api, Model } from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { findRlmModelMatches } from "../../../src/core/rlm-runtime.js";

const baseModel = {
	api: "openai-completions" as Api,
	baseUrl: "",
	reasoning: false,
	input: [] as ("image" | "text")[],
	maxTokens: 4096,
};

const omenAlpha: Model<Api> = {
	...baseModel,
	provider: "opencode-go",
	id: "omen-alpha",
	name: "Omen Alpha",
	contextWindow: 100000,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
};

const gptSol: Model<Api> = {
	...baseModel,
	provider: "openai",
	id: "gpt-5.6-sol",
	name: "GPT 5.6 Sol",
	contextWindow: 100000,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
};

const gptAlt: Model<Api> = {
	...baseModel,
	provider: "openai",
	id: "gpt-5.6-alt",
	name: "GPT 5.6 Alt",
	contextWindow: 100000,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
};

describe("findRlmModelMatches", () => {
	it("matches models when query terms are in a different order", () => {
		const models = [omenAlpha, gptSol, gptAlt];

		// Matches all terms in out-of-order sequence
		const result = findRlmModelMatches("omen alpha opencode go", models, 20);
		expect(result).toHaveLength(1);
		expect(result[0].selector).toBe("opencode-go/omen-alpha");

		// Prior issues (#810) order-sensitive matching behavior
		const result2 = findRlmModelMatches("5.6 gpt sol", models, 20);
		expect(result2).toHaveLength(1);
		expect(result2[0].selector).toBe("openai/gpt-5.6-sol");

		// Also check that it can still do exact selector matches
		const result3 = findRlmModelMatches("opencode-go/omen-alpha", models, 20);
		expect(result3).toHaveLength(1);
		expect(result3[0].selector).toBe("opencode-go/omen-alpha");

		// And model name only searches still work
		const result4 = findRlmModelMatches("alpha", models, 20);
		expect(result4).toHaveLength(1);
		expect(result4[0].selector).toBe("opencode-go/omen-alpha");

		// Partial token coverage does not produce unrelated matches
		const result5 = findRlmModelMatches("omen 5.6", models, 20);
		expect(result5).toHaveLength(0);
	});
});
