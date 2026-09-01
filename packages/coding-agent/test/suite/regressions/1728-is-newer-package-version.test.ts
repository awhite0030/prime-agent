import { describe, expect, it } from "vitest";
import { isNewerPackageVersion } from "../../../src/utils/version-check.js";

describe("isNewerPackageVersion", () => {
	it("returns false when the current version is unparseable", () => {
		// As reported in #1728, unparseable versions should abstain and return false
		// rather than incorrectly returning true when string comparing against standard semver.
		expect(isNewerPackageVersion("0.8.1", "some-local-build")).toBe(false);
		expect(isNewerPackageVersion("0.8.0", "some-local-build")).toBe(false);
		expect(isNewerPackageVersion("0.7.9", "some-local-build")).toBe(false);
	});

	it("returns true when candidate is valid but candidate > current (and current parses)", () => {
		expect(isNewerPackageVersion("0.8.1", "0.8.0")).toBe(true);
	});

	it("falls back to string inequality when candidate is unparseable but current is parseable", () => {
		expect(isNewerPackageVersion("1.2.3.4", "1.2.3")).toBe(true);
		expect(isNewerPackageVersion("1.2.3", "1.2.3")).toBe(false);
	});
});
