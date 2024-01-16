import { PluginManager } from './managers/PluginManager';
import SettingsManager from './managers/SettingsManager';

export type OverlaySettings = {
  channelName?: string;
  plugins?: string[];
  customPlugins?: string;
};

export type BootOptions = {
  settingsManager: typeof SettingsManager;

  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;

  settingsRenderer?: RendererConstructor;
  overlayRenderer?: RendererConstructor;
};

export type RendererInstance = {
  init(): void;
};

export type RendererConstructor = {
  new (pluginMgr: PluginManager, bootOptions: BootOptions, settingsMgr: SettingsManager): RendererInstance;
};

export type OverlayPlugin = {
  bootOptions?: BootOptions;
  settingsManager?: SettingsManager;
  loadSettingsSchema(): void;
  renderSettings(): void;
  renderOverlay(): void;
};

export type OverlayPluginConstructor = {
  new (bootOptions: BootOptions, settingsMgr: SettingsManager): OverlayPlugin;
};
