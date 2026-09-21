const fs = require('fs');

function replaceInFile(path) {
    let content = fs.readFileSync(path, 'utf-8');

    if (!content.includes('StreamingJsonParser')) {
        content = content.replace(
            'import { parseStreamingJson } from "../utils/json-parse.js";',
            'import { parseStreamingJson, StreamingJsonParser } from "../utils/json-parse.js";'
        );
    }

    if (path.includes('openai-responses-shared.ts')) {
        content = content.replace(
            /currentBlock\.arguments = parseStreamingJson\(currentBlock\.partialJson\);/g,
            '(currentBlock as any)._parser ??= new StreamingJsonParser();\n\t\t\t\t\t\t\t\tcurrentBlock.arguments = (currentBlock as any)._parser.parse(currentBlock.partialJson);'
        );
        content = content.replace(
            'currentBlock.arguments = item.arguments\n\t\t\t\t\t\t\t? parseStreamingJson(currentBlock.partialJson)\n\t\t\t\t\t\t\t: parseStreamingJson(item.arguments || "{}");',
            'currentBlock.arguments = item.arguments ? (((currentBlock as any)._parser ??= new StreamingJsonParser()), (currentBlock as any)._parser.flush(currentBlock.partialJson)) : parseStreamingJson(item.arguments || "{}");'
        );
    } else if (path.includes('amazon-bedrock.ts')) {
        content = content.replace(
            /block\.arguments = parseStreamingJson\(block\.partialJson\);/g,
            '(block as any)._parser ??= new StreamingJsonParser();\n\t\t\tblock.arguments = (block as any)._parser.parse(block.partialJson);'
        );
        // Inside finish block
        content = content.replace(
            `			(block as any)._parser ??= new StreamingJsonParser();
			block.arguments = (block as any)._parser.parse(block.partialJson);
			// Finalize in-place and strip the scratch buffer so replay only`,
            `			(block as any)._parser ??= new StreamingJsonParser();
			block.arguments = (block as any)._parser.flush(block.partialJson);
			// Finalize in-place and strip the scratch buffer so replay only`
        );
    } else if (path.includes('anthropic.ts')) {
        content = content.replace(
            /block\.arguments = parseStreamingJson\(block\.partialJson\);/g,
            '(block as any)._parser ??= new StreamingJsonParser();\n\t\t\t\t\t\t\tblock.arguments = (block as any)._parser.parse(block.partialJson);'
        );
    } else if (path.includes('openai-completions.ts')) {
        content = content.replace(
            /block\.arguments = parseStreamingJson\(block\.partialArgs\);/g,
            '(block as any)._parser ??= new StreamingJsonParser();\n\t\t\t\t\t\t\t\tblock.arguments = (block as any)._parser.parse(block.partialArgs);'
        );
        content = content.replace(
            `			const finishBlock = (block: StreamingBlock) => {
				const contentIndex = getContentIndex(block);
				if (contentIndex === -1) {
					return;
				}
				if (block.type === "text") {
					stream.push({
						type: "text_end",
						contentIndex,
						content: block.text,
						partial: output,
					});
				} else if (block.type === "thinking") {
					stream.push({
						type: "thinking_end",
						contentIndex,
						content: block.thinking,
						partial: output,
					});
				} else if (block.type === "toolCall") {
					(block as any)._parser ??= new StreamingJsonParser();
								block.arguments = (block as any)._parser.parse(block.partialArgs);`,
            `			const finishBlock = (block: StreamingBlock) => {
				const contentIndex = getContentIndex(block);
				if (contentIndex === -1) {
					return;
				}
				if (block.type === "text") {
					stream.push({
						type: "text_end",
						contentIndex,
						content: block.text,
						partial: output,
					});
				} else if (block.type === "thinking") {
					stream.push({
						type: "thinking_end",
						contentIndex,
						content: block.thinking,
						partial: output,
					});
				} else if (block.type === "toolCall") {
					(block as any)._parser ??= new StreamingJsonParser();
					block.arguments = (block as any)._parser.flush(block.partialArgs);`
        );
    }

    fs.writeFileSync(path, content);
}

replaceInFile("packages/ai/src/providers/openai-responses-shared.ts");
replaceInFile("packages/ai/src/providers/amazon-bedrock.ts");
replaceInFile("packages/ai/src/providers/anthropic.ts");
replaceInFile("packages/ai/src/providers/openai-completions.ts");
