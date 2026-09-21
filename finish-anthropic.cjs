const fs = require('fs');
let content = fs.readFileSync("packages/ai/src/providers/anthropic.ts", 'utf-8');

const search = `		case "toolCall":
			(block as any)._parser ??= new StreamingJsonParser();
							block.arguments = (block as any)._parser.parse(block.partialJson);
			// Finalize in-place and strip the scratch buffer so replay only`;
const replace = `		case "toolCall":
			(block as any)._parser ??= new StreamingJsonParser();
			block.arguments = (block as any)._parser.flush(block.partialJson);
			// Finalize in-place and strip the scratch buffer so replay only`;
content = content.replace(search, replace);
fs.writeFileSync("packages/ai/src/providers/anthropic.ts", content);
