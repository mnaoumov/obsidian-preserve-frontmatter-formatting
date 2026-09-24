# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Preserve Frontmatter Formatting makes every front matter write in the vault keep the author's formatting — comments, quoting, blank lines, indentation, inline versus block sequences — by routing it through `obsidian-dev-utils`' CST-splice engine (`obsidian-dev-utils/obsidian/frontmatter-formatting`). It has no settings and no commands beyond the shared **Open demo vault** one. **Installing it is the consent**: nobody's writes change without an install, and disabling it reverses everything.

The plugin is deliberately thin. The engine, its fallback guarantee and its differential fuzz all live in `obsidian-dev-utils`, and changes to how a block is spliced belong there, not here. This repo owns the two routes into that engine, and the contract of Obsidian's own method.

## The two routes a front matter write takes

- **Plugins built on `obsidian-dev-utils`** never call Obsidian's `processFrontMatter()`: the library reimplements it and writes through its own `setFrontmatter()`, which consults a preserver held in the library's realm-wide state bag on `globalThis.__obsidianDevUtils`. Every bundled copy of the library reads the same bag, so ONE `enableFrontmatterFormattingPreservation()` here reaches every such plugin in the vault. That is how "the library detects whether this plugin is enabled" is satisfied without any change to the library: the registration IS the detection. It needs a consumer copy of the library from 105.2.0 onwards, which is when the seam shipped.
- **Every other plugin**, and some of Obsidian's own edits (`updateProperty` / `deleteProperty` and a Bases card move all call it), goes through `app.fileManager.processFrontMatter()`, which `FrontmatterFormattingComponent` patches on the `FileManager` PROTOTYPE.

Both are undone on unload: the preserver is unregistered and the patch removed.

## The seam, measured rather than assumed

Measured in `obsidian-versions/obsidian.asar/app.js` (1.14.x public build) on 2026-09-23. **Re-measure before changing `process-front-matter-content.ts`; do not re-derive it from the typings.**

- `FileManager.prototype.processFrontMatter(file, fn, options)` resolves without doing anything when `file.extension !== 'md'`, and otherwise awaits `this.vault.process(file, (data) => transform(data, fn), options)`. All I/O, write queueing and cache invalidation are in `vault.process` and are not touched here.
- The transform: `getFrontMatterInfo(data)`; parse the block with `parseYaml` when it exists, else `{}`; **anything that is not an object becomes `{}`**; call `fn(object)`; if the object has no keys, return the note from `contentStart` (block deleted) — or the note unchanged when there was no block; otherwise splice a `stringifyYaml` of the object into `[from, to)`, or prepend `---\n<yaml>---\n` when there was no block.
- `process-front-matter-content.ts` mirrors that step for step. **Its one deliberate departure is the no-op guard**: if the callback leaves the object deep-equal to what was parsed, the content is returned unchanged. Obsidian re-stringifies unconditionally, so without the guard a read-only callback reformats the block — measured on the original prototype, `parseDocument` → `toString()` with zero mutation still changed 9 of 21 corpus samples. The guard also changes two edge cases, both toward losing less: an empty block, or one whose YAML is not a mapping, is deleted by Obsidian even when the callback does nothing, and is left alone here.

## Invariants that are easy to break

- **Non-Markdown files go to `fallback()`, never to this plugin's own path.** Obsidian's method is a silent no-op for them; calling through keeps that exact rather than re-implementing it.
- **The patch REPLACES the method for Markdown files; it cannot wrap it.** The loss happens between the callback and the write, inside the method, where no wrapper reaches. A patch another plugin installed BEFORE this one is therefore bypassed for Markdown files, and one installed AFTER wraps this one as usual. The patch carries `Symbol.for('preserve-frontmatter-formatting:processFrontMatter')` as its `patchToken`, so a later patch can detect it and defer.
- **Conflicts: none declared, and that was decided (2026-09-23).** `obsidian-dev-utils`' conflict machinery (`PluginGateComponent` via `getPluginConflicts()`) is keyed on plugin ids, and no plugin is known to patch `processFrontMatter`. When one is found, declare it there with `PluginConflictSeverity.Warn` rather than inventing a new mechanism.
- **Unload unregisters the realm's preserver outright** (`registerFrontmatterFormattingPreserver(null)`). The library exposes no getter to restore a previous one, and no other plugin registers one today. If one ever does, this needs a save-and-restore seam in the library first.
- **Nothing in this repo may emit YAML itself.** Every write goes through `setFrontmatter()`, so the library's fallback — which is what guarantees no note comes out worse than Obsidian would write it — is never bypassed.

## Deviations from the standard plugin architecture

Plugins in this workspace share one architecture; intentional deviations are documented here.

- **No settings, no settings tab, no `src/plugin-settings*.ts`.** The plugin's enabled state is the only switch, by the owner's decision: installing it is the consent. The demo-vault coverage suite is registered with `rootFolder` alone accordingly.
- **No `src/styles/`.** The plugin renders nothing, so no empty `styles.css` asset is produced.

## Screenshots

Four frames — `images/screenshots/screenshot-desktop-{1,2}.png` at 1200x800 and `screenshot-mobile-{1,2}.png` at 900x1600 — captured by `src/screenshots.desktop-capture.integration.test.ts` and `src/screenshots.android-capture.integration.test.ts`, and written **only** by `npm run capture:screenshots`. Their `*-capture.` infix matches none of the standard project globs on purpose, so `npm run test:integration` never rewrites the PNGs. The mobile pair needs the `obsidian_screenshots` AVD (see `scripts/vitest-config.ts`).

**The decision, 2026-09-24.** The plugin renders nothing, so the frames are of what it changes: the stored TEXT of one hand-formatted note, in **Source mode** (Live Preview shows the Properties table, which hides every character this plugin keeps), after a real `app.fileManager.processFrontMatter()` write made exactly as another plugin would make it. Desktop puts two copies side by side — left written with this plugin disabled, right with it enabled — once for a write that sets `status: done` and once for a read-only callback. A phone cannot hold two panes, so the mobile pair splits the same comparison across its two frames. Captions were measured with `measureLabelCaption`, not counted.

## Traps to clear before the first release

- **The plugin id `preserve-frontmatter-formatting` can never be renamed once the community registry lists it.** It was chosen by the owner and checked free against the registry on 2026-09-23; check again at submission.
- **The GitHub remote does not exist yet**, so every `github.com/mnaoumov/obsidian-preserve-frontmatter-formatting` link fails `lint:md`'s link check until it does. That is the only expected red gate.
- **The demo-vault asset is `preserve-frontmatter-formatting-demo-vault.zip`, unversioned**, and it unzips into one `preserve-frontmatter-formatting-demo-vault-<version>` folder.
- **`scripts/version.ts` carries no template-release guard, and must stay that way.**
- **The `obsidian-integration-testing` entry in `package.json`'s `overrides` is what makes `npm install` work here at all — do not tidy it away.** `pinned-versions.json` carries the reasoning and a mechanical check that flips the day it can go.
