const fs = require("fs");

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, "utf-8");

    // Add WeakMap field
    if (!content.includes("decorationCache")) {
        content = content.replace(/(class \w+ extends Container \{)/, "$1\n\tprivate decorationCache = new WeakMap<string[], string[]>();");
    }

    // Replace render logic
    const oldRender = `		lines[0] = OSC133_ZONE_START + lines[0];
		lines[lines.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + lines[lines.length - 1];
		return lines;`;

    const newRender = `		let decorated = this.decorationCache.get(lines);
		if (!decorated) {
			decorated = [...lines];
			decorated[0] = OSC133_ZONE_START + decorated[0];
			decorated[decorated.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + decorated[decorated.length - 1];
			this.decorationCache.set(lines, decorated);
		}
		return decorated;`;

    content = content.replace(oldRender, newRender);
    fs.writeFileSync(filePath, content);
}

fixFile("packages/coding-agent/src/modes/interactive/components/assistant-message.ts");
fixFile("packages/coding-agent/src/modes/interactive/components/user-message.ts");
fixFile("packages/coding-agent/src/modes/interactive/components/slash-command-message.ts");
