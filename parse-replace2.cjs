const fs = require('fs');

function replaceInFile(path, replacer) {
    const content = fs.readFileSync(path, 'utf-8');
    const newContent = replacer(content);
    if (content !== newContent) {
        fs.writeFileSync(path, newContent);
    }
}

replaceInFile("packages/ai/src/providers/openai-completions.ts", (content) => {
    // 3. OpenRouter encode once at stream end
    // "And OpenRouter does the same with JSON.stringify on reasoning_details."
    // In stream loop for reasoning_details
    const stringifyTarget = `								if (matchingToolCall) {
									matchingToolCall.thoughtSignature = JSON.stringify(detailRecord);
								}`;
    const stringifyReplace = `								if (matchingToolCall) {
									(matchingToolCall as any)._rawDetailRecord = detailRecord;
								}`;
    content = content.replace(stringifyTarget, stringifyReplace);

    // In `finishBlock` for toolCall
    const finishTarget = `delete block.streamIndex;`;
    const finishReplace = `delete block.streamIndex;\n\t\t\t\t\tif ((block as any)._rawDetailRecord) { block.thoughtSignature = JSON.stringify((block as any)._rawDetailRecord); delete (block as any)._rawDetailRecord; }`;
    content = content.replace(finishTarget, finishReplace);

    return content;
});
