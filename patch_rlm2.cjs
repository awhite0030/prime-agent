const fs = require('fs');
const path = require('path');
const file = path.join('packages', 'coding-agent', 'src', 'core', 'prompts', 'rlm.ts');
let content = fs.readFileSync(file, 'utf8');

// Fix the syntax error in the prompt
content = content.replace(
  "limit sizes to avoid exhausting memory.\n\t\"Search with `rg` and `fd` through `bash()`. Do not use `grep -r` or `find /`.\",",
  "limit sizes to avoid exhausting memory.\",\n\t\"Search with `rg` and `fd` through `bash()`. Do not use `grep -r` or `find /`.\","
);

fs.writeFileSync(file, content);
