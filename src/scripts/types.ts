import SettingsManager from './managers/SettingsManager';
import { OverlayRenderer } from './renderers/OverlayRenderer';
import SettingsRenderer from './renderers/SettingsRenderer';

export type OverlaySettings = {
  channelName?: string;
  plugins?: string[];
  customPlugins?: string;
};

export type BootOptions = {
  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;

  settingsRenderer?: typeof SettingsRenderer;
  overlayRenderer?: typeof OverlayRenderer;
  settingsManager: typeof SettingsManager;
};

export type OverlayPlugin = {
  name: string;
  bootOptions?: BootOptions;
  settingsManager?: SettingsManager;
  loadSettingsSchema(): void;
  renderSettings(): void;
  renderOverlay(): void;
  middleware(): Promise<any> | any;
};

export type OverlayPluginConstructor = {
  new (bootOptions: BootOptions, settingsMgr: SettingsManager): OverlayPlugin;
};
