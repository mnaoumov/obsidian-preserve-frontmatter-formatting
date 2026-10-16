import { OpenDemoVaultCommandHandler } from '@mnaoumov/obsidian-lib/command-handlers/open-demo-vault-command-handler';
import { PluginBase } from '@mnaoumov/obsidian-lib/plugin/plugin';

import { FrontmatterFormattingComponent } from './frontmatter-formatting-component.ts';

export class Plugin extends PluginBase {
  protected override async onloadImpl(): Promise<void> {
    this.addChild(
      new FrontmatterFormattingComponent({
        app: this.app
      })
    );

    await this.commandHandlerComponent.registerCommandHandlers(() => [
      new OpenDemoVaultCommandHandler({
        app: this.app,
        pluginId: this.manifest.id,
        pluginNoticeComponent: this.pluginNoticeComponent,
        pluginVersion: this.manifest.version
      })
    ]);
  }
}
