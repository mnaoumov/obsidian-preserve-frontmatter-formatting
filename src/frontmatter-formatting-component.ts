/**
 * @file
 *
 * Routes every front matter write in the vault through `obsidian-dev-utils`' formatting-preserving engine, by the two
 * routes those writes take.
 */

import type {
  App,
  FileManager
} from 'obsidian';

import { getPrototypeOf } from 'obsidian-dev-utils/object-utils';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';
import { registerFrontmatterFormattingPreserver } from 'obsidian-dev-utils/obsidian/frontmatter';
import { enableFrontmatterFormattingPreservation } from 'obsidian-dev-utils/obsidian/frontmatter-formatting';

import { processFrontMatterContent } from './process-front-matter-content.ts';

/**
 * The token this plugin's `processFrontMatter` patch carries.
 *
 * A `Symbol.for` token, so any plugin bundling its own copy of `obsidian-dev-utils` can find it on the method it is
 * about to wrap and defer to this one rather than race it.
 */
export const PROCESS_FRONT_MATTER_PATCH_TOKEN = Symbol.for('preserve-frontmatter-formatting:processFrontMatter');

/**
 * Parameters for the {@link FrontmatterFormattingComponent} constructor.
 */
export interface FrontmatterFormattingComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;
}

/**
 * Makes every front matter write in the vault keep the author's formatting, for as long as it is loaded.
 *
 * Front matter reaches disk by two routes, and each needs its own half:
 *
 * - **Plugins built on `obsidian-dev-utils`** never call Obsidian's `processFrontMatter()`: the library reimplements
 *   it, and writes through its own `setFrontmatter()`. That function consults a formatting preserver held in the
 *   library's realm-wide state bag on `globalThis`, which every bundled copy of the library shares — so registering
 *   the engine ONCE, here, reaches every such plugin in the vault, including ones that never heard of this plugin.
 * - **Every other plugin** calls `app.fileManager.processFrontMatter()`, which is patched here onto the same engine.
 *
 * Both halves are undone on unload: the preserver is unregistered and the patch removed, so disabling the plugin
 * returns every writer to Obsidian's own behavior.
 *
 * **The patch replaces the method for Markdown files rather than wrapping it**, because the loss happens inside it —
 * between the callback and the write — where no wrapper can reach. So a patch another plugin installed on
 * `processFrontMatter` BEFORE this one is not called for Markdown files, while one installed AFTER it wraps this one
 * as usual. {@link PROCESS_FRONT_MATTER_PATCH_TOKEN} lets a later patch detect this one and defer to it.
 */
export class FrontmatterFormattingComponent extends MonkeyAroundComponent {
  private readonly app: App;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: FrontmatterFormattingComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
   * Registers the preserver and installs the patch.
   */
  public override onload(): void {
    super.onload();

    enableFrontmatterFormattingPreservation();
    this.register(() => {
      registerFrontmatterFormattingPreserver(null);
    });

    this.registerMethodPatch({
      $object: getPrototypeOf(this.app.fileManager),
      methodName: 'processFrontMatter',
      patchHandler: ({
        fallback,
        originalArguments
      }) => {
        const [file] = originalArguments;
        // Obsidian's own method resolves without touching a non-Markdown file, and calling through keeps that exact.
        return file.extension === 'md' ? this.processFrontMatter(originalArguments) : fallback();
      },
      patchToken: PROCESS_FRONT_MATTER_PATCH_TOKEN
    });
  }

  private async processFrontMatter([file, callback, options]: Parameters<FileManager['processFrontMatter']>): Promise<void> {
    await this.app.vault.process(file, (content) => processFrontMatterContent(content, callback), options);
  }
}
