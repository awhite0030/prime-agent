import { afterEach, describe, expect, it, vi } from "vitest";

const setGlobalDispatcherMock = vi.hoisted(() => vi.fn());
const EnvHttpProxyAgentMock = vi.hoisted(() => vi.fn((opts) => opts));

vi.mock("../../../src/main.js", () => ({ main: vi.fn() }));
vi.mock("../../../src/cli/daemon-launch.js", () => ({ maybeStartDaemonEarly: vi.fn() }));
vi.mock("../../../src/cli/owned-session-worker.js", () => ({
	closeOwnedSessionWorkerOwnerWatch: vi.fn(),
	installOwnedSessionWorkerOwnerWatch: vi.fn(),
	isOwnedSessionWorkerProcess: vi.fn(() => false),
	maybeRunOwnedSessionWorkerFrontend: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("undici", async (importOriginal) => {
	return {
		...(await importOriginal<typeof import("undici")>()),
		setGlobalDispatcher: setGlobalDispatcherMock,
		EnvHttpProxyAgent: EnvHttpProxyAgentMock,
	};
});

describe("ENG-2297 undici global dispatcher timeouts", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
		setGlobalDispatcherMock.mockClear();
		EnvHttpProxyAgentMock.mockClear();
	});

	it("uses env overrides for timeouts", async () => {
		vi.stubEnv("PI_UNDICI_BODY_TIMEOUT", "12345");
		vi.stubEnv("PI_UNDICI_HEADERS_TIMEOUT", "67890");

		const { runCli } = await import("../../../src/cli-main.js");
		await runCli();

		expect(setGlobalDispatcherMock).toHaveBeenCalled();
		expect(EnvHttpProxyAgentMock).toHaveBeenCalledWith({
			bodyTimeout: 12345,
			headersTimeout: 67890,
		});
	});

	it("uses defaults when env is missing", async () => {
		const { runCli } = await import("../../../src/cli-main.js");
		await runCli();

		expect(setGlobalDispatcherMock).toHaveBeenCalled();
		expect(EnvHttpProxyAgentMock).toHaveBeenCalledWith({
			bodyTimeout: 600000,
			headersTimeout: 60000,
		});
	});

	it("allows explicitly setting 0 to disable timeouts", async () => {
		vi.stubEnv("PI_UNDICI_BODY_TIMEOUT", "0");
		vi.stubEnv("PI_UNDICI_HEADERS_TIMEOUT", "0");

		const { runCli } = await import("../../../src/cli-main.js");
		await runCli();

		expect(setGlobalDispatcherMock).toHaveBeenCalled();
		expect(EnvHttpProxyAgentMock).toHaveBeenCalledWith({
			bodyTimeout: 0,
			headersTimeout: 0,
		});
	});
});
