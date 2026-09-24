import { evalInObsidian } from 'obsidian-integration-testing';
import { getTemporaryVault } from 'obsidian-integration-testing/vitest-global-setup-plugin';
import {
  describe,
  expect,
  it
} from 'vitest';

const PLUGIN_ID = 'preserve-frontmatter-formatting';
const FORMATTED_NOTE = '---\n# A comment line.\ndish: "Pancakes"   # quoted on purpose\ntags: [breakfast, sweet]\n\nstatus: draft\n---\nBody\n';
const FORMATTED_NOTE_DONE = FORMATTED_NOTE.replace('status: draft', 'status: done');

interface WriteResult {
  readonly afterChange: string;
  readonly afterReadOnly: string;
}

/*
 * The tests that can fail for the right reason. Everything else in this repo runs against mocks, while the
 * plugin's whole premise is a claim about the REAL app: that `FileManager.prototype.processFrontMatter` is still
 * the method every documented front matter write goes through, and that replacing it keeps the note's bytes. A
 * reading of `app.js` is not a run — if an Obsidian release moves the write, this is what notices.
 *
 * Desktop only, deliberately: the component touches `app.fileManager` and `app.vault`, neither of which differs
 * by platform, and `plugin.android.integration.test.ts` already proves the plugin loads on Android.
 */
describe('Preserve Frontmatter Formatting', () => {
  it('should keep the formatting of every property a processFrontMatter change does not reach', async () => {
    const result = await writeThroughProcessFrontMatter('keep.md');

    expect(result.afterChange).toBe(FORMATTED_NOTE_DONE);
    expect(result.afterReadOnly).toBe(FORMATTED_NOTE_DONE);
  });

  it('should give Obsidian its own behavior back when the plugin is disabled', async () => {
    const result = await evalInObsidian({
      async callback({
        app,
        FORMATTED_NOTE: note,
        PLUGIN_ID: pluginId
      }): Promise<string> {
        const file = await app.vault.create('disabled.md', note);
        await app.plugins.disablePlugin(pluginId);
        try {
          await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            frontmatter['status'] = 'done';
          });
          return await app.vault.read(file);
        } finally {
          await app.plugins.enablePlugin(pluginId);
        }
      },
      input: {
        FORMATTED_NOTE,
        PLUGIN_ID
      },
      vaultPath: getTemporaryVault().path
    });

    // Obsidian's own rewrite drops the comments and the quotes and expands the inline list, which is the loss
    // this plugin exists to prevent — asserting it proves the first test is measuring the plugin, not the app.
    expect(result).not.toContain('#');
    expect(result).not.toContain('"Pancakes"');
    expect(result).toContain('status: done');
  });
});

/**
 * Writes a formatted note, changes one property through `processFrontMatter`, then runs a read-only callback.
 *
 * @param path - The note's path in the temporary vault.
 * @returns The note's content after each of the two calls.
 */
async function writeThroughProcessFrontMatter(path: string): Promise<WriteResult> {
  return await evalInObsidian({
    async callback({
      app,
      FORMATTED_NOTE: note,
      path: notePath
    }): Promise<WriteResult> {
      const file = await app.vault.create(notePath, note);
      await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        frontmatter['status'] = 'done';
      });
      const afterChange = await app.vault.read(file);

      await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        if (frontmatter['status'] !== 'done') {
          throw new Error('The read-only callback saw the wrong status');
        }
      });
      const afterReadOnly = await app.vault.read(file);

      return { afterChange, afterReadOnly };
    },
    input: {
      FORMATTED_NOTE,
      path
    },
    vaultPath: getTemporaryVault().path
  });
}
