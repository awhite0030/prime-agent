import { Container } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { InteractiveMode } from "../../../src/modes/interactive/interactive-mode.js";
import { initTheme } from "../../../src/modes/interactive/theme/theme.js";

type SubmitContext = {
	defaultEditor: { onSubmit?: (text: string) => Promise<void> };
	editor: { getText: () => string; setText: (text: string) => void; addToHistory?: (text: string) => void };
	handleNameCommand: (args: string) => Promise<void>;
	showError: (message: string) => void;
	[key: string]: unknown;
};

type Prototype = {
	setupEditorSubmitHandler(this: SubmitContext): void;
};

const prototype = InteractiveMode.prototype as unknown as Prototype;

describe("InteractiveMode Command Usage", () => {
	beforeAll(() => initTheme("dark"));

	it("submits /name taken with a rejecting setSessionName and expects showError", async () => {
		let editorText = "";
		const submitContext = {
			defaultEditor: {},
			editor: {
				getText: () => editorText,
				setText: (text: string) => {
					editorText = text;
				},
			},
			agentConnection: {
				setSessionName: vi.fn(async () => {
					throw new Error("taken");
				}),
			},
			submittedInputBehavior: "steer",
			inputSubmissionGeneration: 0,
			inputSubmissionsPending: 0,
			pendingPromptStashReleases: [],
			promptStashState: {},
			clearShortcutGuide: vi.fn(),
			showError: vi.fn(),
			updatePendingMessagesDisplay: vi.fn(),
			ui: { requestRender: vi.fn() },
			chatContainer: new Container(),
		} as unknown as SubmitContext;

		// Mock handleNameCommand to simulate actual flow, wait, handleNameCommand is actually defined on the prototype and it uses this.agentConnection.
		const handleNameCommandContext = { ...submitContext, getCurrentSessionName: vi.fn(() => "old name") };
		submitContext.handleNameCommand = async function (this: any, args: string) {
			return (InteractiveMode.prototype as any).handleNameCommand.call(this, args);
		}.bind(handleNameCommandContext);

		prototype.setupEditorSubmitHandler.call(submitContext);

		const submission = submitContext.defaultEditor.onSubmit?.("/name taken");
		await submission;

		expect(submitContext.showError).toHaveBeenCalledWith("taken");
	});
});
