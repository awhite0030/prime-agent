const fs = require('fs');

function addImport(path) {
    let content = fs.readFileSync(path, 'utf-8');
    content = content.replace(
        'import { parseJsonWithRepair } from "../utils/json-parse.js";',
        'import { parseJsonWithRepair, StreamingJsonParser } from "../utils/json-parse.js";'
    );
    fs.writeFileSync(path, content);
}
addImport("packages/ai/src/providers/anthropic.ts");
