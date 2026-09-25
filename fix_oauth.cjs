const fs = require('fs');

let content = fs.readFileSync('packages/ai/src/mcp/oauth.ts', 'utf8');

const fetchRegistrationStr = `async function fetchRegistration(url: string, init: RequestInit): Promise<unknown> {
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

const fetchJsonStr = `async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
	const res = await fetchResponse(url, init);
	if (!res.ok) {
		throw new Error(\`\${init?.method ?? "GET"} \${url} failed: \${res.status}\`);
	}
	return res.json();
}

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

content = content.replace(fetchRegistrationStr, fetchJsonStr);

fs.writeFileSync('packages/ai/src/mcp/oauth.ts', content);
