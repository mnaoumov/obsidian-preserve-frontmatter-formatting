/**
 * @file
 *
 * Produces the desktop screenshots the community-store listing needs, driving a real Obsidian and writing
 * `images/screenshots/screenshot-desktop-N.png`.
 *
 * **This plugin renders nothing**, so what a screenshot can honestly show was a question before it was a
 * capture chore. It has no settings, no modal, no view and no command but the shared **Open demo vault**
 * one. What it changes is the TEXT of a note, so the frames are of that text: two copies of one hand-formatted
 * note, side by side in Source mode, after the same front matter write — the left one with this plugin
 * disabled, the right one with it enabled. The difference is then the whole picture, and nothing in the frame
 * claims a UI the plugin does not have.
 *
 * **The writes are real `app.fileManager.processFrontMatter()` calls**, the route every other plugin takes,
 * made from this suite exactly as a plugin would make them. The plugin is toggled with `disablePlugin` /
 * `enablePlugin` around the left note's write, which is the same switch a reader flips in Settings.
 *
 * **Source mode rather than Live Preview**, because Live Preview renders front matter as the Properties table,
 * which shows values and hides every character this plugin exists to keep.
 *
 * Excluded from `npm run test:integration` by its file name — see the `capture-screenshots:desktop` project in
 * `scripts/vitest-config.ts`. Capturing is an explicit operation (`npm run capture:screenshots`), not something
 * every test run does.
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

/**
 * `change` sets `status` to `done`, as any plugin updating a property does; `read` only reads the properties.
 */
type FrontmatterWrite = 'change' | 'read';

/**
 * The stored text of each of the two notes after its write.
 */
interface StoredTexts {
  readonly with: string;
  readonly without: string;
}

const PLUGIN_ID = 'preserve-frontmatter-formatting';

/*
 * Hand-formatted the way people actually keep front matter: a heading comment, a trailing comment, deliberate
 * quotes, an inline list and a blank line. Obsidian's own rewrite changes every one of those.
 */
const FORMATTED_NOTE = [
  '---',
  '# Recipe card: kept by hand, edited by plugins.',
  'title: "Blueberry pancakes"',
  'tags: [breakfast, sweet]   # inline on purpose',
  '',
  'servings: 4',
  'prep: \'15 min\'',
  'status: draft',
  '---',
  '',
  'Mix, rest for ten minutes, fry.',
  ''
].join('\n');

const WITHOUT_PLUGIN_NOTE_PATH = 'Without the plugin.md';
const WITH_PLUGIN_NOTE_PATH = 'With the plugin.md';

const WIDTH_IN_PIXELS = 1200;
const HEIGHT_IN_PIXELS = 800;

const TEST_TIMEOUT_IN_MILLISECONDS = 120_000;

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  await evalInObsidian({
    async callback({ app }) {
      const SETTLE_DELAY_IN_MILLISECONDS = 1000;

      app.changeTheme('obsidian');
      // The notes are the picture: both sidebars would only take width from them.
      app.workspace.leftSplit.collapse();
      app.workspace.rightSplit.collapse();

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);
    },
    vaultPath: vaultPath()
  });
});

describe('desktop store screenshots', () => {
  it('1 - one property changed by a plugin', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const texts = await stageSideBySide('change');

    expect(texts.with).toBe(FORMATTED_NOTE.replace('status: draft', 'status: done'));
    expect(texts.without).not.toContain('#');
    await shoot(1, 'A plugin sets status: done. Left: Obsidian. Right: this plugin');
  });

  it('2 - a plugin that only reads', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const texts = await stageSideBySide('read');

    expect(texts.with).toBe(FORMATTED_NOTE);
    expect(texts.without).not.toBe(FORMATTED_NOTE);
    await shoot(2, 'A read-only plugin. Left: rewritten anyway. Right: kept');
  });
});

/**
 * Captures the window, captions it, and writes it as `images/screenshots/screenshot-desktop-<index>.png`.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({
    heightInPixels: HEIGHT_IN_PIXELS,
    vaultPath: vaultPath(),
    widthInPixels: WIDTH_IN_PIXELS
  });

  const labeled = await labelScreenshot(bytes, { text: caption });

  expect(readPngDimensions(labeled)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-desktop-${String(index)}.png`), labeled);
}

/**
 * Writes the formatted note twice, runs the same front matter write on each — the first with the plugin
 * disabled — and opens both side by side in Source mode.
 *
 * @param write - `change` sets `status` to `done`; `read` only reads the properties.
 * @returns The stored text of each note after its write.
 */
async function stageSideBySide(write: FrontmatterWrite): Promise<StoredTexts> {
  return await evalInObsidian({
    async callback({
      app,
      FORMATTED_NOTE: note,
      PLUGIN_ID: pluginId,
      WITH_PLUGIN_NOTE_PATH: withPath,
      WITHOUT_PLUGIN_NOTE_PATH: withoutPath,
      write: frontmatterWrite
    }): Promise<StoredTexts> {
      const SETTLE_DELAY_IN_MILLISECONDS = 1200;

      async function writeNote(path: string): Promise<string> {
        const existing = app.vault.getFileByPath(path);
        const file = existing ?? await app.vault.create(path, note);
        if (existing) {
          await app.vault.modify(file, note);
        }
        await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
          if (frontmatterWrite === 'change') {
            frontmatter['status'] = 'done';
          }
        });
        return await app.vault.read(file);
      }

      await app.plugins.disablePlugin(pluginId);
      let withoutText: string;
      try {
        withoutText = await writeNote(withoutPath);
      } finally {
        await app.plugins.enablePlugin(pluginId);
      }
      const withText = await writeNote(withPath);

      /*
       * The second shot reuses the first one's two panes. Detaching them instead leaves `getLeaf(false)` handing
       * back a leaf that is no longer in the workspace, which then has no parent split to divide.
       */
      const markdownLeaves = app.workspace.getLeavesOfType('markdown');
      const leftLeaf = markdownLeaves[0] ?? app.workspace.getLeaf(false);
      await leftLeaf.setViewState({
        state: { file: withoutPath, mode: 'source', source: true },
        type: 'markdown'
      });
      const rightLeaf = markdownLeaves[1] ?? app.workspace.createLeafBySplit(leftLeaf, 'vertical');
      await rightLeaf.setViewState({
        state: { file: withPath, mode: 'source', source: true },
        type: 'markdown'
      });
      app.workspace.setActiveLeaf(rightLeaf, { focus: false });

      await sleep(SETTLE_DELAY_IN_MILLISECONDS);

      return { with: withText, without: withoutText };
    },
    input: {
      FORMATTED_NOTE,
      PLUGIN_ID,
      WITH_PLUGIN_NOTE_PATH,
      WITHOUT_PLUGIN_NOTE_PATH,
      write
    },
    vaultPath: vaultPath()
  });
}

function vaultPath(): string {
  return getTemporaryVault().path;
}
