const fs = require('fs');

function testJson() {
    let content = fs.readFileSync("packages/ai/src/providers/openai-completions.ts", 'utf-8');
    if(content.includes("JSON.parse(tc.thoughtSignature!)")) {
        console.log("WAIT, I didn't change JSON.parse for JSON.stringify!");
    } else {
        console.log("Good.");
    }
}
testJson();
