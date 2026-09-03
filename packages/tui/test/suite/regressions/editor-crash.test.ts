import { describe, it, expect } from "vitest";
import { wordWrapLine } from "../../../src/components/editor.js";

describe("wordWrapLine", () => {
    it("does not crash on wide graphemes", () => {
        // An emoji with visible width 2, in a maxWidth of 1.
        // It should not recurse infinitely.
        const chunks = wordWrapLine("🌍", 1);
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].text).toBe("🌍");
    });
});
