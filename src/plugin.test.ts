import type {
  App as AppType,
  PluginManifest
} from 'obsidian';

import { castTo } from 'obsidian-dev-utils/object-utils';
import { App } from 'obsidian-test-mocks/obsidian';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { FrontmatterFormattingComponent } from './frontmatter-formatting-component.ts';
import { Plugin } from './plugin.ts';

vi.mock('./frontmatter-formatting-component.ts', async () => {
  const { Component } = await vi.importActual<ObsidianModule>('obsidian');
  return {
    // eslint-disable-next-line prefer-arrow-callback -- A `function` form is required so vitest can `new` the stub (an arrow throws), and the body must return a fresh real Component.
    FrontmatterFormattingComponent: vi.fn(function frontmatterFormattingComponentStub() {
      return new Component();
    })
  };
});

const PLUGIN_ID = 'preserve-frontmatter-formatting';
const STRICT_PROXY_TARGET_SYMBOL = Symbol.for('strictProxyTarget');

interface AppGlobal {
  app: AppType;
}

interface FrontmatterFormattingComponentConstructorParams {
  readonly app: AppType;
}

interface LoadedFlagHolder {
  loaded__: boolean;
}

interface ObsidianModule {
  Component: new () => object;
}

const manifest = castTo<PluginManifest>({
  id: PLUGIN_ID,
  name: 'Preserve Frontmatter Formatting',
  version: '1.0.0'
});

let app: AppType;
let appMock: App;
let savedGlobalApp: AppType;

describe('Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appMock = App.createConfigured__();
    app = appMock.asOriginalType__();

    // The real PluginBase reads dev-utils state off the app (and the global app).
    seedOnRawTarget(app, 'obsidianDevUtilsState', {});
    seedOnRawTarget(app.workspace, 'onLayoutReady', () => {
      // The wrapper test never fires layout-ready; the child component is a stub.
    });

    savedGlobalApp = castTo<AppGlobal>(window).app;
    castTo<AppGlobal>(window).app = app;
  });

  afterEach(() => {
    castTo<AppGlobal>(window).app = savedGlobalApp;
  });

  it('should add the front matter formatting component with the app', async () => {
    const plugin = new Plugin(app, manifest);
    // PluginBase.onload is async; driving it directly runs onloadImpl and eager-loads the child.
    await plugin.onload();

    const calls = vi.mocked(FrontmatterFormattingComponent).mock.calls;
    expect(calls).toHaveLength(1);

    const params = castTo<FrontmatterFormattingComponentConstructorParams>(calls[0]?.[0]);
    expect(params.app).toBe(plugin.app);

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });

  it('should register the open demo vault command', async () => {
    const plugin = new Plugin(app, manifest);
    const addCommandSpy = vi.spyOn(plugin, 'addCommand');
    // PluginBase.onload is async; driving it directly runs onloadImpl and registers the command handlers.
    await plugin.onload();

    expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'open-demo-vault' }));

    castTo<LoadedFlagHolder>(plugin).loaded__ = true;
    plugin.unload();
  });
});

function seedOnRawTarget(strictProxiedObject: object, key: string, value: unknown): void {
  const rawTarget = castTo<object | undefined>(Reflect.get(strictProxiedObject, STRICT_PROXY_TARGET_SYMBOL)) ?? strictProxiedObject;
  Reflect.set(rawTarget, key, value);
}
