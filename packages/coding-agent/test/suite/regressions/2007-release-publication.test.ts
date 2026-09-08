import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../../..");

test("release script does not contain npm publish", () => {
	const releaseScript = fs.readFileSync(path.join(REPO_ROOT, "scripts/release.mjs"), "utf8");
	expect(releaseScript).not.toContain("npm run publish");
});

test("build-binaries workflow enforces CI gate and immutability", () => {
	const yaml = fs.readFileSync(path.join(REPO_ROOT, ".github/workflows/build-binaries.yml"), "utf8");

	// Check for build_ref resolution to SHA instead of tag ref
	expect(yaml).toContain('build_ref="$GITHUB_SHA_VALUE"');

	// Check CI gate enforcement
	expect(yaml).toContain("Verify CI gate");
	expect(yaml).toContain("check_name=build-check-test");

	// Check immutability enforcement
	expect(yaml).toContain("Verify R2 and GitHub production artifacts drift");
	expect(yaml).not.toContain("--clobber");
});
