const fs = require('fs');
const path = require('path');
const file = path.join('packages', 'coding-agent', 'src', 'core', 'tools', 'ipython.ts');
let content = fs.readFileSync(file, 'utf8');

// Add getShellEnv to imports from shell.js
content = content.replace(
  'import { resolveKernelBashShell } from "../../utils/shell.js";',
  'import { getShellEnv, resolveKernelBashShell } from "../../utils/shell.js";'
);

// Inject into env:
content = content.replace(
  '					...this.options?.env,',
  '					...getShellEnv(),\n					...this.options?.env,'
);

fs.writeFileSync(file, content);
