import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

describe("Installer node version checks", () => {
	let tmpDir: string;
	let installScriptPath: string;

	beforeAll(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prime-agent-install-test-"));
		installScriptPath = path.resolve(__dirname, "../../../../../install.sh");
	});

	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	function runInstallWithNodeVersion(version: string) {
		try {
			const fakeNodePath = path.join(tmpDir, "node");
			const script = `#!/bin/sh
if [ "$1" = "--version" ]; then
    echo "v${version}"
elif [ "$1" = "-e" ]; then
    evalScript=$(echo "$2" | sed "s/process.versions.node/'${version}'/g")
    ${process.execPath} -e "$evalScript"
fi
`;
			fs.writeFileSync(fakeNodePath, script, { mode: 0o755 });

			const wrapperPath = path.join(tmpDir, "wrapper.sh");
			const wrapperScript = `#!/bin/bash
export PATH="${tmpDir}:$PATH"

python3 -c "
import sys
with open(sys.argv[1]) as f:
    lines = f.readlines()
in_func = False
for line in lines:
    if 'node_version_string_is_new_enough() {' in line:
        in_func = True
    if in_func:
        print(line, end='')
    if in_func and line.startswith('}'):
        break
" "${installScriptPath}" > "${tmpDir}/test-install.sh"

source "${tmpDir}/test-install.sh"

node_version=$(node --version)
clean_version=\${node_version#v}

if ! node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && (minor > 8 || (minor === 8 && patch >= 0))) ? 0 : 1)' >/dev/null; then
    printf 'error: Prime Agent requires Node.js 22.8.0 or newer. Found %s.\n' "$node_version"
fi

if ! node_version_string_is_new_enough "$clean_version"; then
    echo "error: check_node_version failed for $node_version."
fi
`;
			fs.writeFileSync(wrapperPath, wrapperScript, { mode: 0o755 });

			const output = execFileSync("bash", [wrapperPath], {
				encoding: "utf-8",
				timeout: 5000,
			});
			return { ok: true, output };
		} catch (error: any) {
			return { ok: false, output: error.stdout ? error.stdout + error.stderr : error.message };
		}
	}

	test("accepts 22.8.0", () => {
		const result = runInstallWithNodeVersion("22.8.0");
		expect(result.output).not.toContain("error: Prime Agent requires Node.js");
		expect(result.output).not.toContain("error: check_node_version failed");
	});

	test("accepts newer stable version 22.9.0", () => {
		const result = runInstallWithNodeVersion("22.9.0");
		expect(result.output).not.toContain("error: Prime Agent requires Node.js");
		expect(result.output).not.toContain("error: check_node_version failed");
	});

	test("accepts newer stable version 23.0.0", () => {
		const result = runInstallWithNodeVersion("23.0.0");
		expect(result.output).not.toContain("error: Prime Agent requires Node.js");
		expect(result.output).not.toContain("error: check_node_version failed");
	});

	test("rejects 20.6.0", () => {
		const result = runInstallWithNodeVersion("20.6.0");
		expect(result.output).toContain("error: Prime Agent requires Node.js");
		expect(result.output).toContain("error: check_node_version failed");
	});

	test("rejects recent 20.x", () => {
		const result = runInstallWithNodeVersion("20.18.1");
		expect(result.output).toContain("error: Prime Agent requires Node.js");
		expect(result.output).toContain("error: check_node_version failed");
	});

	test("rejects 21.x", () => {
		const result = runInstallWithNodeVersion("21.7.0");
		expect(result.output).toContain("error: Prime Agent requires Node.js");
		expect(result.output).toContain("error: check_node_version failed");
	});

	test("rejects 22.7.0", () => {
		const result = runInstallWithNodeVersion("22.7.0");
		expect(result.output).toContain("error: Prime Agent requires Node.js");
		expect(result.output).toContain("error: check_node_version failed");
	});

	test("handles malformed version inputs gracefully (candidate check only)", () => {
		const result = runInstallWithNodeVersion("invalid");
		expect(result.output).toContain("error: check_node_version failed");
	});
});
