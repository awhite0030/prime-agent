import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBundledSkillsDir } from "../../../src/config.js";
import type { PythonSkillRuntimeInfo } from "../../../src/core/skills.js";
import { IpythonKernelProvisioner } from "../../../src/core/tools/ipython.js";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

function bundledAttachImageSkill(): PythonSkillRuntimeInfo {
	const packagePath = join(getBundledSkillsDir(), "attach-image");
	return {
		name: "attach-image",
		importName: "attach_image",
		packagePath,
		pyprojectPath: join(packagePath, "pyproject.toml"),
	};
}

describe("issue #2222 skill module self-name alias", () => {
	let tempDir: string;
	let provisioner: IpythonKernelProvisioner | undefined;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-attach-image-reg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await provisioner?.dispose();
		provisioner = undefined;
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("accepts the attach_image.attach_image(...) spelling instead of returning the submodule", async () => {
		const imagePath = join(tempDir, "sample.png");
		writeFileSync(imagePath, Buffer.from(PNG_BASE64, "base64"));

		provisioner = new IpythonKernelProvisioner(tempDir, {
			pythonSkills: [bundledAttachImageSkill()],
			hostHandlers: {
				"model.info": async () => ({ id: "anthropic/claude-haiku-4.5", input: ["text", "image"] }),
			},
		});

		const manager = await provisioner.ensure();
		const result = await manager.execute(`print(await attach_image.attach_image(${JSON.stringify(imagePath)}))`);

		expect(result.status).toBe("ok");
		expect(result.stdout.trim()).toContain("Loaded 1 image(s) into context");
		expect(result.attachments).toHaveLength(1);
	});
});
