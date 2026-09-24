# Edit a property from any plugin

Every plugin that edits front matter the documented way calls `app.fileManager.processFrontMatter()`. Obsidian parses the block into an object, lets the plugin change it, and then writes out the **whole** object again from scratch. That last step is where the formatting goes. Some of Obsidian's own edits go through the same method, so they lose it the same way.

With this plugin enabled, the write puts in only what changed. Every property the change does not reach keeps its exact characters.

## Try it

[The sample note](<./Materials/Sample note.md>) has a hand-formatted block: a comment line, a quoted dish name with a comment after it, an inline tag list, a blank line and extra spaces. Open it in **Source mode** beside this note, then press:

```code-button
---
caption: Mark the sample note done
---
await require('/demoSetup.ts').toggleSampleNoteStatus(app);
```

The button calls `app.fileManager.processFrontMatter()` exactly as any other plugin would, and flips `status` between `draft` and `done`. Only that line changes. Press it again to flip it back.

Manual equivalent: change **status** in the note's **Properties** view.

To see what Obsidian does on its own, disable **Preserve Frontmatter Formatting** in **Settings -> Community plugins** and press the button again. The block comes back reformatted: no comments, no quotes, one tag per line. Put the note back the way it was with:

```code-button
---
caption: Reset the sample note
---
await require('/demoSetup.ts').resetSampleNote(app);
```

## A change that changes nothing writes nothing

Obsidian rewrites the block even when the callback only **reads** it. So a plugin that merely looks at your properties can reformat them. This button reads the sample note's properties through the same method and changes nothing:

```code-button
---
caption: Read the sample note's properties
---
await require('/demoSetup.ts').readSampleNoteProperties(app);
```

With this plugin enabled the note is left byte for byte as it was.

## Which plugins it covers

- **Plugins that call `app.fileManager.processFrontMatter()`**, which is the documented API and what most plugins use.
- **Plugins built on `obsidian-dev-utils`**, which write front matter through their own copy of that library. They are covered while this plugin is enabled, with no change on their side. This needs a copy of the library from 105.2.0 onwards.

It does not cover a plugin that writes the note's text itself, bypassing both.

## When it steps back

It never makes a note worse than Obsidian would have. If a block uses YAML that it cannot splice faithfully, for example anchors and aliases, the write falls back to Obsidian's own rewrite, exactly as if the plugin were not installed.
