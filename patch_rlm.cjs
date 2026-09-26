const fs = require('fs');
const path = require('path');
const file = path.join('packages', 'coding-agent', 'src', 'core', 'prompts', 'rlm.ts');
let content = fs.readFileSync(file, 'utf8');

// Insert explicit guidance on rg/fd versus grep -r/find.
// "Use Python for reading, searching, and editing files — it gives you reusable variables you can slice, filter, and act on without re-reading. Always assign read/search results to named variables so you can revisit them later. Never run unbounded recursive file scans (e.g., `rglob('*')`) or eager bulk reads (e.g., calling `read_text()` in an unbounded loop); filter paths and limit sizes to avoid exhausting memory.",
content = content.replace(
  "Use Python for reading, searching, and editing files — it gives you reusable variables you can slice, filter, and act on without re-reading. Always assign read/search results to named variables so you can revisit them later. Never run unbounded recursive file scans (e.g., `rglob('*')`) or eager bulk reads (e.g., calling `read_text()` in an unbounded loop); filter paths and limit sizes to avoid exhausting memory.",
  "Use Python for reading, searching, and editing files — it gives you reusable variables you can slice, filter, and act on without re-reading. Always assign read/search results to named variables so you can revisit them later. Never run unbounded recursive file scans (e.g., `rglob('*')`) or eager bulk reads (e.g., calling `read_text()` in an unbounded loop); filter paths and limit sizes to avoid exhausting memory.\n\t\"Search with `rg` and `fd` through `bash()`. Do not use `grep -r` or `find /`.\","
);

fs.writeFileSync(file, content);
