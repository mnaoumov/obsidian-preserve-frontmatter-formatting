import type {
  App as AppType,
  TFile
} from 'obsidian';

import { noop } from 'obsidian-dev-utils/function';
import { getPrototypeOf } from 'obsidian-dev-utils/object-utils';
import { setFrontmatter } from 'obsidian-dev-utils/obsidian/frontmatter';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FrontmatterFormattingComponent } from './frontmatter-formatting-component.ts';

const COMMENTED_NOTE = '---\ntitle: Old   # keep me\nstatus: draft\n---\nBody\n';
const COMMENTED_NOTE_DONE = '---\ntitle: Old   # keep me\nstatus: done\n---\nBody\n';

const NEW_FRONTMATTER = {
  title: 'Old',
  // eslint-disable-next-line perfectionist/sort-objects -- The engine keeps the new object's key order, and the note has this one.
  status: 'done'
};

let app: AppType;

describe('FrontmatterFormattingComponent', () => {
  beforeEach(() => {
    app = App.createConfigured__().asOriginalType__();
  });

  it('should keep the formatting of a Markdown note written through processFrontMatter while loaded', async () => {
    const file = await app.vault.create('note.md', COMMENTED_NOTE);
    const component = new FrontmatterFormattingComponent({ app });
    component.load();

    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      frontmatter['status'] = 'done';
    });

    expect(await app.vault.read(file)).toBe(COMMENTED_NOTE_DONE);
    component.unload();
  });

  it('should write nothing when the callback changes nothing', async () => {
    const note = '---\ntitle:    Old\n---\nBody\n';
    const file = await app.vault.create('note.md', note);
    const component = new FrontmatterFormattingComponent({ app });
    component.load();

    await app.fileManager.processFrontMatter(file, () => {
      // A read-only callback.
    });

    expect(await app.vault.read(file)).toBe(note);
    component.unload();
  });

  it('should hand a non-Markdown file to the original method, and only that', async () => {
    const originalSpy = vi.spyOn(getPrototypeOf(app.fileManager), 'processFrontMatter').mockResolvedValue();
    const textFile = await app.vault.create('data.txt', 'plain');
    const noteFile = await app.vault.create('note.md', COMMENTED_NOTE);
    const component = new FrontmatterFormattingComponent({ app });
    component.load();

    await app.fileManager.processFrontMatter(textFile, noop);
    await app.fileManager.processFrontMatter(noteFile, noop);

    expect(originalSpy).toHaveBeenCalledTimes(1);
    expect(originalSpy).toHaveBeenCalledWith(textFile, noop);
    component.unload();
    originalSpy.mockRestore();
  });

  it('should route obsidian-dev-utils front matter writes through the engine while loaded, and stop on unload', () => {
    const component = new FrontmatterFormattingComponent({ app });
    component.load();

    expect(setFrontmatter(COMMENTED_NOTE, NEW_FRONTMATTER)).toBe(COMMENTED_NOTE_DONE);

    component.unload();

    expect(setFrontmatter(COMMENTED_NOTE, NEW_FRONTMATTER)).not.toBe(COMMENTED_NOTE_DONE);
  });

  it('should restore the original processFrontMatter on unload', async () => {
    const original = app.fileManager.processFrontMatter;
    const component = new FrontmatterFormattingComponent({ app });
    component.load();
    expect(app.fileManager.processFrontMatter).not.toBe(original);

    component.unload();

    expect(app.fileManager.processFrontMatter).toBe(original);
    const file: TFile = await app.vault.create('note.md', COMMENTED_NOTE);
    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
      frontmatter['status'] = 'done';
    });
    expect(await app.vault.read(file)).not.toBe(COMMENTED_NOTE_DONE);
  });
});
