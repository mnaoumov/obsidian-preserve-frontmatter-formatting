import type {
  App,
  TFile
} from 'obsidian';

import { Notice } from 'obsidian';

const SAMPLE_NOTE_PATH = 'Materials/Sample note.md';
const NOTICE_DURATION_IN_MILLISECONDS = 8000;

/**
 * The sample note exactly as this vault ships it, so the reset button can put it back byte for byte.
 */
const SAMPLE_NOTE_CONTENT = "---\n# A hand-formatted block. Every line of it is something Obsidian's own rewrite would change.\ndish: \"Pancakes\"   # quoted on purpose\ntags: [breakfast, sweet]\n\nstatus: draft\nservings:    4\n---\n\n# Sample note\n\nThe buttons in [01 Edit a property from any plugin](<../01 Edit a property from any plugin.md>) change this note's `status` property. Switch to **Source mode** to see the front matter exactly as it is stored.\n";

/**
 * Reads the sample note's properties through `app.fileManager.processFrontMatter()` and changes nothing.
 *
 * Obsidian's own method rewrites the block even then; with the plugin enabled the note is left untouched.
 *
 * Manual equivalent: none. This is what a plugin that only reads your properties does behind your back.
 */
export async function readSampleNoteProperties(app: App): Promise<void> {
  const file = getSampleNote(app);
  const before = await app.vault.read(file);
  let status: unknown;
  await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
    status = frontmatter['status'];
  });
  const after = await app.vault.read(file);
  new Notice(
    `Read status: ${String(status)}.
The note was ${before === after ? 'left byte for byte as it was' : 'rewritten'}.`,
    NOTICE_DURATION_IN_MILLISECONDS
  );
}

/**
 * Puts the sample note back exactly as the vault ships it.
 *
 * Manual equivalent: undo your edits to the note.
 */
export async function resetSampleNote(app: App): Promise<void> {
  await app.vault.modify(getSampleNote(app), SAMPLE_NOTE_CONTENT);
  new Notice('The sample note is back to how the vault ships it.');
}

/**
 * Flips the sample note's `status` between `draft` and `done`, the way any plugin edits a property.
 *
 * Manual equivalent: change **status** in the note's **Properties** view.
 */
export async function toggleSampleNoteStatus(app: App): Promise<void> {
  let newStatus = '';
  await app.fileManager.processFrontMatter(getSampleNote(app), (frontmatter: Record<string, unknown>) => {
    newStatus = frontmatter['status'] === 'done' ? 'draft' : 'done';
    frontmatter['status'] = newStatus;
  });
  new Notice(`The sample note's status is now ${newStatus}. Open it in Source mode to compare.`, NOTICE_DURATION_IN_MILLISECONDS);
}

function getSampleNote(app: App): TFile {
  const file = app.vault.getFileByPath(SAMPLE_NOTE_PATH);
  if (!file) {
    throw new Error(`The sample note is missing: ${SAMPLE_NOTE_PATH}`);
  }

  return file;
}
