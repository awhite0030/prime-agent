const fs = require('fs');
const path = require('path');

const filePath = path.resolve('packages/ai/scripts/generate-models.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const regex = /const deepseekV4Models: Model<"openai-completions">\[\] = \[\s*\{[\s\S]*?\}\s*,\s*\{\s*[\s\S]*?\}\s*,\s*\];\s*allModels\.push\(\.\.\.deepseekV4Models\);/g;

content = content.replace(regex, '');

fs.writeFileSync(filePath, content);
console.log('Patched');
