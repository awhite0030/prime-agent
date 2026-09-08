import assert from "node:assert";
import { describe, it } from "node:test";
import {
	extractTableCellSelectionRegions,
	markTableCell,
	markTableEnd,
	markTableStart,
} from "../../../src/selection-metadata.js";

describe("TUI lone surrogates regression", () => {
	it("handles unpaired surrogates in table cells gracefully", () => {
		const highSurrogate = "lone \uD800 high";
		const lowSurrogate = "lone \uDC00 low";
		const emojiPair = "valid \uD83D\uDE00 emoji"; // 😀

		const cell1 = markTableCell("text1", 0, 0, 0, highSurrogate);
		const cell2 = markTableCell("text2", 0, 1, 0, lowSurrogate);
		const cell3 = markTableCell("text3", 0, 2, 0, emojiPair);

		const lines = [markTableStart(""), `${cell1} | ${cell2} | ${cell3}`, markTableEnd("")];

		const result = extractTableCellSelectionRegions(lines, (index) => ({ id: index }));
		assert.strictEqual(result.regions.length, 3);

		assert.strictEqual(result.regions[0]?.content, "lone \uFFFD high");
		assert.strictEqual(result.regions[1]?.content, "lone \uFFFD low");
		assert.strictEqual(result.regions[2]?.content, emojiPair);
	});
});
