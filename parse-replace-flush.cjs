const { execSync } = require('child_process');
execSync("git restore packages/ai/src/providers/amazon-bedrock.ts packages/ai/src/providers/anthropic.ts packages/ai/src/providers/openai-responses-shared.ts packages/ai/src/providers/openai-completions.ts");
