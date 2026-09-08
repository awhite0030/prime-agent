const fs = require('fs');
const path = 'packages/coding-agent/src/core/refinement/refinement.ts';
let content = fs.readFileSync(path, 'utf8');

// Insert lockSync import if missing
if (!content.includes('import { lockSync }')) {
    content = content.replace('import { randomUUID } from "node:crypto";', 'import { randomUUID } from "node:crypto";\nimport { lockSync } from "proper-lockfile";');
}

// Ensure loadHarnessState uses lockSync
if (!content.includes('releaseLock = lockSync(statePath')) {
    const loadOld = `export function loadHarnessState(
	harnessStateDir: string = getGlobalHarnessStateDir(),
	scope: HarnessScope = "global",
): HarnessState {
	const statePath = getHarnessStatePath(harnessStateDir);
	if (!existsSync(statePath)) {
		return emptyHarnessState();
	}
	let parsed: Partial<HarnessState>;
	try {
		const raw = JSON.parse(readFileSync(statePath, "utf8"));`;
    const loadNew = `export function loadHarnessState(
	harnessStateDir: string = getGlobalHarnessStateDir(),
	scope: HarnessScope = "global",
): HarnessState {
	const statePath = getHarnessStatePath(harnessStateDir);
	if (!existsSync(statePath)) {
		return emptyHarnessState();
	}
	let parsed: Partial<HarnessState>;
	let releaseLock: (() => void) | undefined;
	try {
		try {
			releaseLock = lockSync(statePath, { retries: 10, stale: 5000 });
		} catch {
			// If lock fails, degrade to empty to avoid crashing agent
			return emptyHarnessState();
		}
		const raw = JSON.parse(readFileSync(statePath, "utf8"));`;
    content = content.replace(loadOld, loadNew);

    const tryBlockOld = `		parsed = raw as Partial<HarnessState>;
	} catch {
		return emptyHarnessState();
	}`;
    const tryBlockNew = `		parsed = raw as Partial<HarnessState>;
	} catch {
		return emptyHarnessState();
	} finally {
		releaseLock?.();
	}`;
    content = content.replace(tryBlockOld, tryBlockNew);
}

// Ensure saveHarnessState uses lockSync
if (!content.includes('releaseLock = lockSync(statePath')) {
    content = content.replace(
    /export function saveHarnessState\(harnessStateDir: string, state: HarnessState\): string \{\n\tconst statePath = getHarnessStatePath\(harnessStateDir\);\n\tconst tempPath = `\$\{statePath\}\.\$\{process.pid\}\.\$\{randomUUID\(\)\}.tmp`;\n\tmkdirSync\(harnessStateDir, \{ recursive: true \}\);\n\ttry \{\n\t\tconst mode = existsSync\(statePath\) \? statSync\(statePath\)\.mode & 0o777 : 0o600;\n\t\twriteFileSync\(tempPath, `\$\{JSON.stringify\(state, null, 2\)\}\\n`, \{ encoding: "utf8", mode \}\);\n\t\trenameSync\(tempPath, statePath\);\n\t\} finally \{\n\t\tif \(existsSync\(tempPath\)\) \{\n\t\t\tunlinkSync\(tempPath\);\n\t\t\}\n\t\}\n\treturn statePath;\n\}/g,
    `export function saveHarnessState(harnessStateDir: string, state: HarnessState): string {
	const statePath = getHarnessStatePath(harnessStateDir);
	const tempPath = \`\${statePath}.\${process.pid}.\${randomUUID()}.tmp\`;
	mkdirSync(harnessStateDir, { recursive: true });
	let releaseLock: (() => void) | undefined;
	try {
		if (!existsSync(statePath)) {
			writeFileSync(statePath, "", { encoding: "utf8", mode: 0o600 });
		}
		releaseLock = lockSync(statePath, { retries: 10, stale: 5000 });
		const mode = existsSync(statePath) ? statSync(statePath).mode & 0o777 : 0o600;
		writeFileSync(tempPath, \`\${JSON.stringify(state, null, 2)}\\n\`, { encoding: "utf8", mode });
		renameSync(tempPath, statePath);
	} finally {
		releaseLock?.();
		if (existsSync(tempPath)) {
			unlinkSync(tempPath);
		}
	}
	return statePath;
}`
    );
}

fs.writeFileSync(path, content);
console.log("TS code patched and saved");
