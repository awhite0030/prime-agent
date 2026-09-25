const fs = require('fs');

let content = fs.readFileSync('packages/ai/src/mcp/oauth.ts', 'utf8');

const fetchJsonStr = `async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
	const res = await fetchResponse(url, init);
	if (!res.ok) {
		throw new Error(\`\${init?.method ?? "GET"} \${url} failed: \${res.status}\`);
	}
	return res.json();
}`;

const fetchRegistrationStr = `
async function fetchRegistration(url: string, init: RequestInit): Promise<unknown> {
	const res = await fetchResponse(url, init);
	if (!res.ok) {
		let message = \`\${init.method ?? "GET"} \${url} failed: \${res.status}\`;
		if (res.status === 403) {
			message +=
				" (Dynamic client registration was forbidden. The provider may restrict remote MCP access to pre-approved applications.)";
		}
		throw new Error(message);
	}
	return res.json();
}`;

content = content.replace(fetchRegistrationStr, '');

const registerClientOld = `	const data = (await fetchRegistration(registrationEndpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	})) as { client_id?: unknown };`;

const registerClientNew = `	let data: { client_id?: unknown };
	try {
		data = (await fetchJson(registrationEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})) as { client_id?: unknown };
	} catch (error) {
		if (error instanceof Error && error.message.includes("failed: 403")) {
			throw new Error(
				\`POST \${registrationEndpoint} failed: 403 (Dynamic client registration was forbidden. The provider may restrict remote MCP access to pre-approved applications.)\`
			);
		}
		throw error;
	}`;

content = content.replace(registerClientOld, registerClientNew);

fs.writeFileSync('packages/ai/src/mcp/oauth.ts', content);
