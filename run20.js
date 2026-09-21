// Wait wait wait.
// Look at `SlashCommandMessageComponent` again.
// `class SlashCommandMessageComponent extends Container { ... this.addChild(this.contentBox); }`
// `class UserMessageComponent extends Container { ... this.addChild(this.contentBox); }`
// What if `super.render` in `Container` was recently optimized to JUST return `child.render()` when there is only one child?
// Let's check `tui.ts` one more time for `Container.render`.
