import { buildRlmPrompt } from './packages/coding-agent/src/core/prompts/rlm.js';

console.log(buildRlmPrompt({cwd: "/", skillsDir: "/", messagesPath: "/"}));
