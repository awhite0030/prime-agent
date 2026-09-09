import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const envApiKeysPath = path.join(rootDir, "packages/ai/src/env-api-keys.ts");
const testShPath = path.join(rootDir, "test.sh");
const primeAgentShPath = path.join(rootDir, "prime-agent.sh");

const envApiKeysContent = fs.readFileSync(envApiKeysPath, "utf-8");
const testShContent = fs.readFileSync(testShPath, "utf-8");
const primeAgentShContent = fs.readFileSync(primeAgentShPath, "utf-8");

const expectedKeys = new Set();
for (const match of envApiKeysContent.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    expectedKeys.add(match[1]);
}
for (const match of envApiKeysContent.matchAll(/getProcEnv\("([A-Z0-9_]+)"\)/g)) {
    expectedKeys.add(match[1]);
}
for (const match of envApiKeysContent.matchAll(/(?<=["'])([A-Z][A-Z0-9_]{3,})(?=["'])/g)) {
    // Exclude false positives like constants or imports that happen to be all caps.
    if (
        !match[1].startsWith("NODE_") &&
        !match[1].startsWith("PRIME_AGENT_") &&
        !["JSON", "NEVER", "WITHOUT"].includes(match[1])
    ) {
        expectedKeys.add(match[1]);
    }
}

function getUnsetKeys(scriptContent) {
    const keys = new Set();
    for (const match of scriptContent.matchAll(/^[ \t]*unset[ \t]+([A-Z0-9_]+)/gm)) {
        keys.add(match[1]);
    }
    return keys;
}

const testShUnsets = getUnsetKeys(testShContent);
const primeAgentShUnsets = getUnsetKeys(primeAgentShContent);

let failed = false;

for (const key of expectedKeys) {
    if (!testShUnsets.has(key)) {
        console.error(`Error: test.sh does not unset ${key}`);
        failed = true;
    }
    if (!primeAgentShUnsets.has(key)) {
        console.error(`Error: prime-agent.sh does not unset ${key}`);
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}

console.log("Env key lists check passed.");
