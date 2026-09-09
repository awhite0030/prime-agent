import { describe, expect, it } from "vitest";
import { AgentsViewMode } from "../../../src/modes/agents-view/agents-view-mode.js";

describe("Regression #2024 - Agents view: opening a running RLM subagent session hangs at 'waiting to load'", () => {
	it("resolves selection anchor for a running subagent despite saved catalog refresh pending", () => {
		const persistentState = {
			savedCatalogLoaded: false,
		};
		const mode = new AgentsViewMode(
			{
				config: {},
				uiServices: {
					getThemes: () => [],
					settingsManager: {
						getTheme: () => "dark",
						onThemeChange: () => () => {},
						getShowHardwareCursor: () => false,
						getClearOnShrink: () => false,
						getEditorPaddingX: () => 0,
						getAutocompleteMaxVisible: () => 5,
						getAnimateCursor: () => false,
					},
					getInitialCwd: () => "/test",
				} as any,
			},
			persistentState,
		);

		// Manually inject state that simulates waiting for a catalog fetch while
		// a live subagent row is currently selected.
		(mode as any).savedCatalogRefreshPending = true;
		(mode as any).selectionAnchorPending = true;
		(mode as any).selectedIndex = 0;
		(mode as any).rows = [
			{
				kind: "subagent",
				selectable: true,
				summary: {
					id: "2",
					sessionId: "1",
					activeSessionId: "2",
					lifecycle: "live",
					hasActiveHeartbeat: false,
					messages: [],
				},
				identity: "active:2",
				parentIdentity: "session:1",
				depth: 2,
				section: "running",
			},
		];

		// Trigger the resolution method
		(mode as any).resolveMissingSelectionAnchor();

		// The pending status should be cleared since it is a live subagent
		expect((mode as any).selectionAnchorPending).toBe(false);
		expect((mode as any).selectedActiveSessionId).toBe("2");
	});
});
