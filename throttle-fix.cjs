const fs = require("fs");

function fixParseStreamingJson() {
    let content = fs.readFileSync("packages/ai/src/utils/json-parse.ts", "utf-8");
    if (!content.includes("export class StreamingJsonParser")) {
        const replacement = `export class StreamingJsonParser<T = Record<string, unknown>> {
\tprivate lastParsedString?: string;
\tprivate lastParsedObject: T = {} as T;
\tprivate lastParseTime = 0;

\tparse(partialJson: string | undefined): T {
\t\tif (!partialJson || partialJson.trim() === "") return {} as T;
\t\tif (partialJson === this.lastParsedString) return this.lastParsedObject;
\t\t
\t\tconst now = Date.now();
\t\tif (now - this.lastParseTime < 100) return this.lastParsedObject;

\t\tthis.lastParsedString = partialJson;
\t\tthis.lastParsedObject = parseStreamingJson<T>(partialJson);
\t\tthis.lastParseTime = now;
\t\treturn this.lastParsedObject;
\t}

\tflush(partialJson: string | undefined): T {
\t\tthis.lastParsedString = partialJson;
\t\tthis.lastParsedObject = parseStreamingJson<T>(partialJson);
\t\tthis.lastParseTime = Date.now();
\t\treturn this.lastParsedObject;
\t}
}

export function parseStreamingJson<T = Record<string, unknown>>(partialJson: string | undefined): T {`;
        content = content.replace("export function parseStreamingJson<T = Record<string, unknown>>(partialJson: string | undefined): T {", replacement);
        fs.writeFileSync("packages/ai/src/utils/json-parse.ts", content);
    }
}
fixParseStreamingJson();
