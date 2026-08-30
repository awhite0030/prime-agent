import { createMcpOAuthProvider } from "@earendil-works/pi-ai/mcp";
import { describe, expect, it, vi } from "vitest";

// Re-implement a minimal form of loginWithManualCode testing utility
async function loginWithManualCode(
	provider: ReturnType<typeof createMcpOAuthProvider>,
): Promise<{ creds: object; authUrl: string }> {
	let authUrl = "";
	const creds = await provider.login({
		onAuth: (info: { url: string }) => {
			authUrl = info.url;
		},
		onPrompt: async () => "",
		onManualCodeInput: async () => {
			if (!authUrl) throw new Error("No authUrl");
			const params = new URL(authUrl).searchParams;
			return `${params.get("redirect_uri")}?code=the-code&state=${params.get("state")}`;
		},
	});
	return { creds, authUrl };
}

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

describe("Regression #1715: MCP OAuth servers with DCR disabled and pre-registered clientId", () => {
	it("skips DCR when a client ID is provided and allows login", async () => {
		const RESOURCE = "https://mcp.twelvelabs.io/jockey";
		const ISSUER = "https://auth.twelvelabs.io";

		const fetchMock = vi.fn(async (input: unknown): Promise<Response> => {
			const url =
				input instanceof URL ? input.toString() : typeof input === "string" ? input : (input as Request).url;

			// 1. Resource probe
			if (url === RESOURCE) {
				return new Response("", { status: 401 });
			}

			// 2. PRM discovery
			if (url === "https://mcp.twelvelabs.io/.well-known/oauth-protected-resource/jockey") {
				return jsonResponse({
					resource: RESOURCE,
					authorization_servers: [ISSUER],
				});
			}

			// 3. AS metadata discovery
			if (url === "https://auth.twelvelabs.io/.well-known/oauth-authorization-server") {
				return jsonResponse({
					issuer: ISSUER,
					authorization_endpoint: `${ISSUER}/oidc/authorize`,
					token_endpoint: `${ISSUER}/oidc/token`,
					// DCR is disabled on this server
					registration_endpoint: undefined,
				});
			}

			// 4. Token exchange
			if (url === `${ISSUER}/oidc/token`) {
				return jsonResponse({
					access_token: "test-access-token",
					expires_in: 3600,
				});
			}

			throw new Error(`unexpected fetch: ${url}`);
		});

		vi.stubGlobal("fetch", fetchMock);

		const provider = createMcpOAuthProvider({
			server: "jockey",
			url: RESOURCE,
			clientId: "https://example.test/oauth/client-metadata.json",
		});

		const { creds, authUrl } = await loginWithManualCode(provider);

		expect(creds).toMatchObject({
			access: "test-access-token",
			clientId: "https://example.test/oauth/client-metadata.json",
			endpoint: RESOURCE,
		});

		const authUrlObj = new URL(authUrl);
		expect(authUrlObj.searchParams.get("client_id")).toBe("https://example.test/oauth/client-metadata.json");

		vi.unstubAllGlobals();
	});
});
