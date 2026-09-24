# Preserve Frontmatter Formatting

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/mnaoumov) [![GitHub release](https://img.shields.io/github/v/release/mnaoumov/obsidian-preserve-frontmatter-formatting)](https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting/releases) [![GitHub downloads](https://img.shields.io/github/downloads/mnaoumov/obsidian-preserve-frontmatter-formatting/total)](https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting/releases) [![Coverage: 100%](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting)

**Keeps your YAML front matter the way you wrote it when a plugin changes a property.** When any plugin edits a property of a note in [Obsidian](https://obsidian.md/), even through the documented API, Obsidian rewrites the note's whole front matter block. Comments disappear, quotes are dropped, blank lines go, and inline lists such as `[a, b]` are expanded to one item per line. That happens to every property in the block, including the ones the plugin never touched, and even when it changed nothing at all.

With this plugin enabled, a property change rewrites only the property that changed, and a change that changes nothing writes nothing. It covers every plugin that edits front matter through `app.fileManager.processFrontMatter()`, which includes some of Obsidian's own edits, and every plugin built on [`obsidian-dev-utils`](https://github.com/mnaoumov/obsidian-dev-utils). There are no settings: installing the plugin is the switch, and disabling it gives you Obsidian's own behavior back.

## Demo vault

**The documentation is a demo vault.** Its notes explain what changes and why, with buttons that edit a sample note's properties the same way other plugins do, so you can compare the stored text with the plugin on and off.

**[Start reading here](<./demo-vault/00 Start.md>)** — it is plain markdown, so it works on GitHub with nothing installed.

A copy of the vault ships with every release. You can access it via any of the following:

1. Running the **Preserve Frontmatter Formatting: Open demo vault** command.
2. Downloading `preserve-frontmatter-formatting-demo-vault.zip` from the [Releases](https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting/releases). It unzips into a single `preserve-frontmatter-formatting-demo-vault-<version>` folder.
3. Browsing its source in [`demo-vault/`](./demo-vault/README.md) in this repository.

## What it does

- **Only the changed property is rewritten.** Every other line of the block keeps its exact characters: comments, including the spacing before them, single and double quotes, blank lines, indentation, inline `[a, b]` lists, and folded or literal text. [01 Edit a property from any plugin](<./demo-vault/01 Edit a property from any plugin.md>)
- **A change that changes nothing writes nothing.** Obsidian rewrites the block even when a plugin only reads the properties, so a plugin that merely looks at your front matter can reformat it. With this plugin enabled, the note is left as it was. [01 Edit a property from any plugin](<./demo-vault/01 Edit a property from any plugin.md>)
- **It covers plugins without their cooperation.** Plugins that call `app.fileManager.processFrontMatter()` are covered by a patch of that method. Plugins built on `obsidian-dev-utils` from 105.2.0 onwards write front matter through their own copy of the library, and this plugin switches that copy's formatting-preserving mode on for as long as it is enabled.

A value that **does** change is written in the default style, so a changed quoted string comes back unquoted, the same as Obsidian would write it.

## What it deliberately does not do

- **It never makes a note worse than Obsidian would.** When it cannot prove that a change can be spliced into the block faithfully, for example because the block uses YAML anchors and aliases, it falls back to Obsidian's own rewrite for that one change, exactly as if it were not installed.
- **It does not cover a plugin that writes the note's text itself**, bypassing both routes above.
- **It replaces `processFrontMatter()` for Markdown files rather than wrapping it**, because the formatting is lost inside that method, where a wrapper cannot reach. Another plugin that patched the same method **before** this one loaded is therefore not called for Markdown files; one that patches it **after** wraps this plugin as usual.
- **It keeps comments as well as the `yaml` library can place them, which is not perfectly.** That library documents its own comment handling as not completely stable, in particular for trailing comments. Comments on lines the change does not reach are never re-emitted at all, so they are safe. A comment beside a property that is removed or rewritten may go with it.

## Installation

The plugin is not yet listed in [the official Community Plugins repository](https://community.obsidian.md/plugins). Until it is, install it as a beta release.

### Beta versions

To install the latest beta release of this plugin (regardless if it is available in [the official Community Plugins repository](https://community.obsidian.md) or not), follow these steps:

1. Ensure you have the [BRAT plugin](https://community.obsidian.md/plugins/obsidian42-brat) installed and enabled.
2. Click [Install via BRAT](https://intradeus.github.io/http-protocol-redirector?r=obsidian://brat?plugin=https://github.com/mnaoumov/obsidian-preserve-frontmatter-formatting).
3. An Obsidian pop-up window should appear. In the window, click the `Add plugin` button once and wait a few seconds for the plugin to install.

## Debugging

By default, debug messages for this plugin are hidden.

To show them, run the following command in the `DevTools Console`:

```js
window.DEBUG.enable('preserve-frontmatter-formatting');
```

For more details, refer to the [documentation](https://mnaoumov.dev/obsidian-dev-utils/guides/debugging/).

## Changelog

All notable changes to this project will be documented in the [CHANGELOG](./CHANGELOG.md).

## Contributing

Contributions are welcome — see [CONTRIBUTING](./CONTRIBUTING.md) to get set up.

## Support

<!-- markdownlint-disable MD033 -->

<a href="https://www.buymeacoffee.com/mnaoumov" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" width="217"></a>

<!-- markdownlint-enable MD033 -->

## My other Obsidian resources

[See my other Obsidian resources](https://github.com/mnaoumov/obsidian-resources).

## License

© [Michael Naumov](https://github.com/mnaoumov/)
