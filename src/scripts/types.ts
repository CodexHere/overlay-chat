import PluginManager from './managers/PluginManager.js';
import SettingsManager from './managers/SettingsManager.js';

// Bootstrapping

export type ErrorManager = {
  showError(err: Error): void;
};

export type ConstructorOptions = {
  settingsRenderer?: RendererConstructor;
  overlayRenderer?: RendererConstructor;
  settingsManager: typeof SettingsManager;
};

export type BootstrapOptions = {
  renderOptions: RenderOptions;
  constructorOptions: ConstructorOptions;
};

// Overlay Instance

export type OverlaySettings = {
  channelName?: string;
  plugins?: string[];
  customPlugins?: string;
};

// Renderers

export type Managers = {
  settingsManager: SettingsManager;
  pluginManager?: PluginManager;
  errorManager: ErrorManager;
};

export type RenderOptions = {
  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;
};

export type RendererInstance = {
  init(): Promise<any> | any;
  middleware?(): Promise<any> | any;
};

export type RendererConstructor = {
  new (managers: Managers, renderOptions: RenderOptions): RendererInstance;
};

export type OverlayPlugin = {
  name: string;
  managers: Managers;
  renderOptions: RenderOptions;
  loadSettingsSchema?(): void;
  renderSettings?(): void;
  renderOverlay?(): void;
  middleware?(): Promise<any> | any;
};

export type OverlayPluginConstructor = {
  new (managers: Managers, renderOptions: RenderOptions): OverlayPlugin;
};
