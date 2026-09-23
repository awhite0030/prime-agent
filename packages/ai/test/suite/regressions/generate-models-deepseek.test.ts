import { expect, test, vi } from "vitest";

const mockWriteFileSync = vi.hoisted(() => vi.fn());
vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	return {
		...actual,
		writeFileSync: mockWriteFileSync,
	};
});

test("generate-models handles deepseek models dynamically", async () => {
	const oldFetch = global.fetch;
	try {
		global.fetch = async (url: string | Request | URL) => {
			const urlString = url.toString();
			if (urlString.includes("models.dev")) {
				return { json: async () => ({ "amazon-bedrock": { models: {} } }) } as any;
			}
			if (urlString.includes("openrouter.ai")) {
				return {
					json: async () => ({
						data: [
							{
								id: "mock",
								name: "Mock",
								pricing: { prompt: "0", completion: "0" },
								context_length: 100,
								architecture: { tokenizer: "mock", instruction_format: "mock" },
								top_provider: { max_completion_tokens: 100 },
							},
						],
					}),
				} as any;
			}
			if (urlString.includes("ai-gateway")) {
				return {
					json: async () => ({
						models: [
							{
								id: "deepseek/deepseek-v4-flash",
								tags: ["tool-use"],
								pricing: { input: "0.1", output: "0.2", input_cache_read: "0.01" },
							},
						],
					}),
				} as any;
			}
			return { json: async () => ({ "amazon-bedrock": { models: {} } }) } as any;
		};

		await // @ts-ignore
		await import("../../../scripts/generate-models.ts");

		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(mockWriteFileSync).toHaveBeenCalled();
		const outputArg = mockWriteFileSync.mock.calls.find((call) => call[0].toString().includes("models.generated.ts"));
		expect(outputArg).toBeDefined();
		if (outputArg) {
			expect(outputArg[1]).toContain("deepseek-v4-flash");
		}
	} finally {
		global.fetch = oldFetch;
	}
});
