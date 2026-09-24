# Start here

Welcome to the [Preserve Frontmatter Formatting](https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting/) demo vault.

**The problem.** When a plugin changes a single property, Obsidian rewrites the note's whole YAML front matter. Comments disappear, quotes are dropped, blank lines go, and inline lists such as `[a, b]` become one item per line. That happens even to the properties the plugin never touched, and even when it changed nothing at all.

**What this plugin does.** While it is enabled, a property change rewrites only the property that changed, and a change that changes nothing writes nothing. Everything else in the block keeps the exact characters you typed. It has no settings: installing it is the switch, and disabling it gives you Obsidian's own behavior back.

**Your first success, in under a minute.** Open [01 Edit a property from any plugin](<./01 Edit a property from any plugin.md>). Its buttons are code buttons: each one shows up as a captioned rectangle, **clicking it runs the code**, and any result appears as a notice. The `</>` toggle beside a button reveals the code it runs. Press **Mark the sample note done**, then open [the sample note](<./Materials/Sample note.md>) in Source mode. The comments, the quotes and the inline list are all still there.

## Features

- [01 Edit a property from any plugin](<./01 Edit a property from any plugin.md>)
