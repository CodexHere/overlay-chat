import SettingsManager from './SettingsManager';

export type OverlaySettings = {
  channelName?: string;
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
  new (bootOptions: BootOptions, settingsMgr: SettingsManager): RendererInstance;
};
