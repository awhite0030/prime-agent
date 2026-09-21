import { Box, Container, Text } from "@earendil-works/pi-tui";
import { parseSlashCommand } from "../../../core/slash-commands.js";
import { theme } from "../theme/theme.js";

const OSC133_ZONE_START = "\x1b]133;A\x07";
const OSC133_ZONE_END = "\x1b]133;B\x07";
const OSC133_ZONE_FINAL = "\x1b]133;C\x07";

export function isLeadingSlashCommand(text: string, isRecognized: (name: string) => boolean): boolean {
	const command = parseSlashCommand(text);
	return command !== undefined && isRecognized(command.name);
}

export function styleSlashCommandText(text: string, styleRest: (rest: string) => string = (rest) => rest): string {
	const parsed = parseSlashCommand(text);
	const commandEnd = parsed ? parsed.name.length + 1 : text.length;
	return `${theme.fg("accent", text.slice(0, commandEnd))}${styleRest(text.slice(commandEnd))}`;
}

/** Renders a durable session command with the same layout as a user message. */
export class SlashCommandMessageComponent extends Container {
	private decorationCache = new WeakMap<string[], string[]>();
	private readonly contentBox: Box;

	constructor(text: string) {
		super();
		this.contentBox = new Box(2, 1, (content: string) => theme.getUserMessageBackgroundColor()(content));
		this.contentBox.addChild(new Text(styleSlashCommandText(text), 0, 0));
		this.addChild(this.contentBox);
	}

	setExpanded(_expanded: boolean): void {}

	override render(width: number): string[] {
		const lines = super.render(width);
		if (lines.length === 0) return lines;
		let decorated = this.decorationCache.get(lines);
		if (!decorated) {
			decorated = [...lines];
			decorated[0] = OSC133_ZONE_START + decorated[0];
			decorated[decorated.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + decorated[decorated.length - 1];
			this.decorationCache.set(lines, decorated);
		}
		return decorated;
	}
}
