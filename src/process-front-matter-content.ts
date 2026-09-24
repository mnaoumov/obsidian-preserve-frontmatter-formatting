/**
 * @file
 *
 * The content transform behind the patched `FileManager.processFrontMatter()`: the same contract as Obsidian's own,
 * with the write routed through `obsidian-dev-utils`' `setFrontmatter()`, which splices the change into the block
 * instead of writing all of it out again.
 *
 * Obsidian's own transform, read out of `obsidian.asar/app.js`, is a dozen lines and is mirrored here step by step:
 * locate the block, parse it (anything that is not an object becomes `{}`), hand the object to the callback, delete
 * the block when the object comes back empty, and otherwise replace only the block's inner text — or prepend a new
 * block when there was none. Only the write step is new, plus one guard.
 */

import type { GenericObject } from 'obsidian-dev-utils/type-guards';

import {
  getFrontMatterInfo,
  parseYaml
} from 'obsidian';
import { isDeepEqual } from 'obsidian-dev-utils/object-utils';
import { setFrontmatter } from 'obsidian-dev-utils/obsidian/frontmatter';

/**
 * The callback `FileManager.processFrontMatter()` takes: it mutates the front matter object in place.
 */
export type FrontMatterCallback = (frontmatter: GenericObject) => void;

/**
 * Runs a `processFrontMatter()` callback against a note's content and returns the content to write.
 *
 * **A callback that changes nothing writes nothing.** This guard is the one deliberate departure from Obsidian's
 * own transform, which re-stringifies the block unconditionally, so that a plugin which merely READS the front
 * matter through this API still rewrites it. It departs in two edge cases as well, both in the direction of losing
 * less: a block that is present but empty, or whose YAML is not a mapping, is deleted by Obsidian's transform even
 * when the callback does nothing; here it is left alone.
 *
 * @param content - The note's current content.
 * @param callback - The callback to run against the parsed front matter.
 * @returns The note's new content.
 */
export function processFrontMatterContent(content: string, callback: FrontMatterCallback): string {
  const oldFrontmatter = parseFrontmatterObject(content);
  const newFrontmatter = parseFrontmatterObject(content);
  callback(newFrontmatter);

  return isDeepEqual(oldFrontmatter, newFrontmatter) ? content : setFrontmatter(content, newFrontmatter);
}

function parseFrontmatterObject(content: string): GenericObject {
  const frontmatterInfo = getFrontMatterInfo(content);
  if (!frontmatterInfo.exists) {
    return {};
  }

  const frontmatter: unknown = parseYaml(frontmatterInfo.frontmatter);
  return typeof frontmatter === 'object' && frontmatter !== null ? frontmatter as GenericObject : {};
}
