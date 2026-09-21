const fs = require('fs');
let content = fs.readFileSync("packages/ai/src/providers/openai-completions.ts", 'utf-8');

content = content.replace(
    'const toolCallBlocksById = new Map<string, StreamingToolCallBlock>();',
    'const toolCallBlocksById = new Map<string, StreamingToolCallBlock>();\n\t\t\tconst toolCallParsers = new Map<string, StreamingJsonParser>();'
);
fs.writeFileSync("packages/ai/src/providers/openai-completions.ts", content);
