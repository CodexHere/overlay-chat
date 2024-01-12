import { PluginManager } from './managers/PluginManager';
import SettingsManager from './managers/SettingsManager';
import { FormEntry } from './utils/Forms';

export type OverlaySettings = {
  channelName?: string;
  theme?: string;
  customTheme?: string;
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
  new (
    pluginMgr: PluginManager,
    bootOptions: BootOptions,
    settingsMgr: SettingsManager,
    settingsSchema?: FormEntry[]
  ): RendererInstance;
};

export type OverlayPlugin = {
  init_settings(): void;
  init_renderer(): void;
};

export type OverlayPluginConstructor = {
  new (bootOptions: BootOptions, settingsMgr: SettingsManager, settingsSchema: FormEntry[]): OverlayPlugin;
};
