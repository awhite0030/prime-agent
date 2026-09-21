const fs = require('fs');

function replaceInFile(path, replacer) {
    const content = fs.readFileSync(path, 'utf-8');
    const newContent = replacer(content);
    if (content !== newContent) {
        fs.writeFileSync(path, newContent);
    }
}

// openai-completions.ts
replaceInFile("packages/ai/src/providers/openai-completions.ts", (content) => {
    // 1. Add map: const toolCallParsers = new Map<string, StreamingJsonParser>();
    // 2. Change import
    content = content.replace(
        'import { parseStreamingJson } from "../utils/json-parse.js";',
        'import { parseStreamingJson, StreamingJsonParser } from "../utils/json-parse.js";'
    );

    // Add parser map in stream()
    content = content.replace(
        'const toolCallBlocksById = new Map<string, ToolCall>();',
        'const toolCallBlocksById = new Map<string, ToolCall>();\n\t\t\tconst toolCallParsers = new Map<string, StreamingJsonParser>();'
    );

    // In `finishBlock`
    content = content.replace(
        'block.arguments = parseStreamingJson(block.partialArgs);',
        'block.arguments = (block.id && toolCallParsers.get(block.id)) ? toolCallParsers.get(block.id)!.flush(block.partialArgs) : parseStreamingJson(block.partialArgs);'
    );

    // In stream loop for toolCalls
    content = content.replace(
        /block\.arguments = parseStreamingJson\(block\.partialArgs\);/g,
        `(block.id && !toolCallParsers.has(block.id)) && toolCallParsers.set(block.id, new StreamingJsonParser());\n\t\t\t\t\t\t\t\tblock.arguments = (block.id && toolCallParsers.get(block.id)) ? toolCallParsers.get(block.id)!.parse(block.partialArgs) : parseStreamingJson(block.partialArgs);`
    );

    // 3. OpenRouter encode once at stream end
    // "And OpenRouter does the same with JSON.stringify on reasoning_details."
    // `matchingToolCall.thoughtSignature = JSON.stringify(detailRecord);` -> move this to `finishBlock` or just don't stringify during the stream.
    // Wait, let's look at how it stringifies.
    return content;
});
