import { describe, it, expect } from "vitest";
import { StdinBuffer } from "../../../src/stdin-buffer.js";

describe("StdinBuffer", () => {
    it("should timeout bracketed paste mode if end marker is not received", async () => {
        const buffer = new StdinBuffer({ timeout: 10 });
        let pasteEmitted = false;
        let dataEmitted = false;

        buffer.on("paste", () => {
            pasteEmitted = true;
        });

        buffer.on("data", () => {
            dataEmitted = true;
        });

        buffer.process("\x1b[200~hello");

        await new Promise(resolve => setTimeout(resolve, 50));

        // Data should be emitted after timeout. Paste should not be emitted.
        expect(pasteEmitted).toBe(false);
        expect(dataEmitted).toBe(true);
    });
});
