const fs = require('fs');
const yaml = fs.readFileSync('.github/workflows/build-binaries.yml', 'utf8');
console.log(yaml.includes('Publish production channel to R2'));
