import { Container } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import type { SessionSlashCommandMessage, SessionSlashCommandResultMessage } from "../../../src/core/messages.js";
import type { AgentConnectionSnapshot } from "../../../src/modes/agent-connection/types.js";
import { AgentActivityTracker } from "../../../src/modes/interactive/agent-activity.js";
import { InteractiveMode } from "../../../src/modes/interactive/interactive-mode.js";
import { initTheme } from "../../../src/modes/interactive/theme/theme.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderResyncedSession = Reflect.get(InteractiveMode.prototype, "renderResyncedSession") as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (this: any, ...args: any[]) => any;
const startRefineLoader = Reflect.get(InteractiveMode.prototype, "startRefineLoader") as AnyFn;
const stopRefineLoader = Reflect.get(InteractiveMode.prototype, "stopRefineLoader") as AnyFn;
const discardRefineLoader = Reflect.get(InteractiveMode.prototype, "discardRefineLoader") as AnyFn;
const getSessionContextFromConnectionSnapshot = Reflect.get(
	InteractiveMode.prototype,
	"getSessionContextFromConnectionSnapshot",
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
) as any;

function createFakeThis(overrides: Record<string, unknown> = {}) {
	const ui = {
		requestRender: vi.fn(),
		terminal: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
	};
	initTheme("auto");
	return {
		ui,
		statusContainer: new Container(),
		chatContainer: new Container(),
		isInitialized: true,
		footer: { invalidate: vi.fn() },
		updateConnectionStateFromEvent: vi.fn(),
		activityTracker: new AgentActivityTracker(),
		updateWorkingLoaderMessage: vi.fn(),
		autoCompactionLoader: undefined,
		retryLoader: undefined,
		refineLoader: undefined,
		loadingAnimation: undefined,
		workingVisible: false,
		stopWorkingLoader: vi.fn(),
		syncWorkingLoader: vi.fn(),
		startRefineLoader(this: Record<string, unknown>) {
			startRefineLoader.call(this);
		},
		stopRefineLoader(this: Record<string, unknown>) {
			stopRefineLoader.call(this);
		},
		discardRefineLoader(this: Record<string, unknown>) {
			discardRefineLoader.call(this);
		},
		getSessionContextFromConnectionSnapshot(this: Record<string, unknown>, snapshot: AgentConnectionSnapshot) {
			return getSessionContextFromConnectionSnapshot.call(this, snapshot);
		},
		applyConnectionStateSnapshot: vi.fn(),
		refreshQueueSelectionFromState: vi.fn(),
		restoreTurnStartFromMessages: vi.fn(),
		replaceSubagentSummary: vi.fn(),
		renderSessionContext: vi.fn(),
		restoreStreamingMessageFromSnapshot: vi.fn(),
		updatePendingMessagesDisplay: vi.fn(),
		isBashRunning: () => false,
		updateTerminalTitle: vi.fn(),
		getGoalState: vi.fn(),
		setGoalAnnouncementBaseline: vi.fn(),
		syncGoalTray: vi.fn(),
		patchConnectionState: vi.fn(),
		...overrides,
	};
}

describe("issue 2873 - refinement loader resync reconciliation", () => {
	it("clears the refine loader when a resync contains a completed refinement", async () => {
		const fakeThis = createFakeThis();

		// Start the refine loader
		fakeThis.startRefineLoader();
		expect(fakeThis.refineLoader).toBeDefined();
		expect(fakeThis.statusContainer.children).toContain(fakeThis.refineLoader);

		const refineStartMsg: SessionSlashCommandMessage = {
			role: "custom",
			customType: "session_slash_command",
			content: "/refine",
			display: true,
			details: {
				command: {
					name: "refine",
					args: "",
					text: "/refine",
				},
				commandEntryId: "cmd1",
			},
			timestamp: 1,
		};

		const refineResultMsg: SessionSlashCommandResultMessage = {
			role: "custom",
			customType: "session_slash_command_result",
			content: "done",
			display: true,
			details: {
				command: {
					name: "refine",
					args: "",
					text: "/refine",
				},
				commandEntryId: "cmd1",
				success: true,
				severity: "info",
			},
			timestamp: 2,
		};

		const snapshot = {
			messages: [refineStartMsg, refineResultMsg],
			state: {
				isBashRunning: false,
				isStreaming: false,
			},
		} as unknown as AgentConnectionSnapshot;

		await renderResyncedSession.call(fakeThis, snapshot);

		expect(fakeThis.refineLoader).toBeUndefined();
	});

	it("keeps the refine loader when a resync contains a pending refinement", async () => {
		const fakeThis = createFakeThis();

		const refineStartMsg: SessionSlashCommandMessage = {
			role: "custom",
			customType: "session_slash_command",
			content: "/refine",
			display: true,
			details: {
				command: {
					name: "refine",
					args: "",
					text: "/refine",
				},
				commandEntryId: "cmd1",
			},
			timestamp: 1,
		};

		const snapshot = {
			messages: [refineStartMsg],
			state: {
				isBashRunning: false,
				isStreaming: false,
			},
		} as unknown as AgentConnectionSnapshot;

		await renderResyncedSession.call(fakeThis, snapshot);

		expect(fakeThis.refineLoader).toBeDefined();
		expect(fakeThis.statusContainer.children).toContain(fakeThis.refineLoader);
	});

	it("clears the refine loader when a resync contains no refinement", async () => {
		const fakeThis = createFakeThis();

		fakeThis.startRefineLoader();

		const snapshot = {
			messages: [],
			state: {
				isBashRunning: false,
				isStreaming: false,
			},
		} as unknown as AgentConnectionSnapshot;

		await renderResyncedSession.call(fakeThis, snapshot);

		expect(fakeThis.refineLoader).toBeUndefined();
	});
});
