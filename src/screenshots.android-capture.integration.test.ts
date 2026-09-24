/**
 * @file
 *
 * Produces the mobile screenshots the community-store listing needs, driving a real Obsidian Mobile on an
 * Android emulator and writing `images/screenshots/screenshot-mobile-N.png`.
 *
 * The mobile half of the set `screenshots.desktop-capture.integration.test.ts` takes, and the same story: one
 * hand-formatted note, one front matter write through `app.fileManager.processFrontMatter()`, and the stored
 * text in Source mode afterwards. Read that file for why the note's text is the only honest thing to
 * photograph. A phone cannot hold the desktop pair's two panes side by side, so the comparison is split across
 * the two frames instead: the first with this plugin enabled, the second with it disabled.
 *
 * There is no mobile equivalent of the desktop viewport override, so the capture is always the device's own
 * framebuffer, and the AVD is built at exactly the 900x1600 the store asks for — see `SCREENSHOT_AVD_NAME` in
 * `scripts/vitest-config.ts`.
 *
 * **The staging is split across short closures, and the waiting for the editor happens in NODE.** One
 * `evalInObsidian` is one `execute/sync`, which Android caps; `pollInObsidian` spends the render wait as a
 * series of short evals instead.
 *
 * Excluded from `npm run test:integration` by its file name — see the `capture-screenshots:android` project in
 * `scripts/vitest-config.ts`. Capturing is an explicit operation (`npm run capture:screenshots`), not something
 * every test run does.
 */

import {
  mkdirSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleepInNode } from 'node:timers/promises';
import {
  captureObsidianScreenshot,
  evalInObsidian,
  labelScreenshot,
  pollInObsidian,
  readPngDimensions
} from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  beforeAll,
  describe,
  expect,
  it
} from 'vitest';

const PLUGIN_ID = 'preserve-frontmatter-formatting';

/*
 * The same note the desktop pair photographs, so the two halves of the set show one story rather than two.
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

const WIDTH_IN_PIXELS = 900;
const HEIGHT_IN_PIXELS = 1600;

/**
 * A cold-booted AVD renders its first editor far more slowly than a warm desktop does, and this budget is
 * spent in Node as short polls rather than inside one closure.
 */
const RENDER_TIMEOUT_IN_MILLISECONDS = 120_000;

/**
 * Generous because the emulator is: the work itself is a boot, two writes and two editor renders.
 */
const TEST_TIMEOUT_IN_MILLISECONDS = 600_000;

const POLL_INTERVAL_IN_MILLISECONDS = 500;

const SETTLE_DELAY_IN_MILLISECONDS = 1500;

const IMAGES_DIRECTORY = join(process.cwd(), 'images', 'screenshots');

beforeAll(async () => {
  await evalInObsidian({
    callback({ app }) {
      app.changeTheme('obsidian');
    },
    vaultPath: vaultPath()
  });

  await sleepInNode(SETTLE_DELAY_IN_MILLISECONDS);
}, TEST_TIMEOUT_IN_MILLISECONDS);

describe('mobile store screenshots', () => {
  it('1 - with the plugin', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const text = await writeNote('With the plugin.md', true);

    expect(text).toBe(FORMATTED_NOTE.replace('status: draft', 'status: done'));
    await openInSourceMode('With the plugin.md');
    await shoot(1, 'A plugin sets status: done. Nothing else in the note moves');
  });

  it('2 - without the plugin', { timeout: TEST_TIMEOUT_IN_MILLISECONDS }, async () => {
    const text = await writeNote('Without the plugin.md', false);

    expect(text).not.toContain('#');
    await openInSourceMode('Without the plugin.md');
    await shoot(2, 'The same change without it: comments and quotes gone');
  });
});

/**
 * Opens the note in Source mode, waiting in Node until its editor holds the front matter.
 *
 * @param notePath - The note to open.
 */
async function openInSourceMode(notePath: string): Promise<void> {
  await pollInObsidian({
    input: { notePath },
    intervalInMilliseconds: POLL_INTERVAL_IN_MILLISECONDS,
    poll(): boolean {
      return [...document.querySelectorAll('.workspace-leaf.mod-active .cm-line')]
        .some((lineEl) => lineEl.textContent.startsWith('status:'));
    },
    async start({ app, notePath: path }): Promise<void> {
      const leaf = app.workspace.getLeaf(false);
      await leaf.setViewState({
        state: { file: path, mode: 'source', source: true },
        type: 'markdown'
      });
      app.workspace.setActiveLeaf(leaf, { focus: false });
    },
    timeoutInMilliseconds: RENDER_TIMEOUT_IN_MILLISECONDS,
    timeoutMessage: 'the note never rendered in Source mode',
    until: (isRendered: boolean): boolean => isRendered,
    vaultPath: vaultPath()
  });

  await sleepInNode(SETTLE_DELAY_IN_MILLISECONDS);
}

/**
 * Captures the device framebuffer, captions it, and writes it as
 * `images/screenshots/screenshot-mobile-<index>.png`.
 *
 * The AVD is 900x1600, so the device frame IS the store's size. Asserting it here is what keeps that true: run
 * this against any other AVD and it fails loudly instead of quietly shipping an off-spec image.
 *
 * @param index - The 1-based listing position.
 * @param caption - The caption drawn across the bottom of the frame.
 */
async function shoot(index: number, caption: string): Promise<void> {
  const bytes = await captureObsidianScreenshot({ vaultPath: vaultPath() });

  expect(readPngDimensions(bytes)).toStrictEqual({
    heightInPixels: HEIGHT_IN_PIXELS,
    widthInPixels: WIDTH_IN_PIXELS
  });

  // Captioned AFTER capture, so the frame stays an untouched device screenshot and rewording a label needs no
  // re-shoot.
  const labeled = await labelScreenshot(bytes, { text: caption });

  mkdirSync(IMAGES_DIRECTORY, { recursive: true });
  writeFileSync(join(IMAGES_DIRECTORY, `screenshot-mobile-${String(index)}.png`), labeled);
}

function vaultPath(): string {
  return getTemporaryVault().path;
}

/**
 * Writes the formatted note and sets its `status` to `done` through `processFrontMatter`, with the plugin
 * enabled or disabled for that one write.
 *
 * @param notePath - The note to write.
 * @param isPluginEnabled - Whether the plugin is enabled during the write.
 * @returns The stored text afterwards.
 */
async function writeNote(notePath: string, isPluginEnabled: boolean): Promise<string> {
  return await evalInObsidian({
    async callback({
      app,
      FORMATTED_NOTE: note,
      isPluginEnabled: shouldEnable,
      notePath: path,
      PLUGIN_ID: pluginId
    }): Promise<string> {
      if (!shouldEnable) {
        await app.plugins.disablePlugin(pluginId);
      }
      try {
        const file = await app.vault.create(path, note);
        await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
          frontmatter['status'] = 'done';
        });
        return await app.vault.read(file);
      } finally {
        if (!shouldEnable) {
          await app.plugins.enablePlugin(pluginId);
        }
      }
    },
    input: {
      FORMATTED_NOTE,
      isPluginEnabled,
      notePath,
      PLUGIN_ID
    },
    vaultPath: vaultPath()
  });
}
