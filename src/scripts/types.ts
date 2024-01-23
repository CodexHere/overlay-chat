import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { EnhancedEventEmitter } from './utils/EnhancedEventEmitter.js';
import { FormEntryFieldGroup } from './utils/Forms.js';

// Managers

export type SettingsInjector = (fieldGroup: FormEntryFieldGroup) => void;
export type SettingsValidator<OS extends OverlaySettings> = (settings: OS) => boolean;

export type PluginImports<CS extends object> = {
  good: OverlayPluginInstance<CS>[];
  bad: Error[];
};

export type ErrorManager = {
  showError(err: Error): void;
};

export type SettingsManagerOptions<OS extends OverlaySettings> = {
  settingsValidator: SettingsValidator<OS>;
  locationHref: string;
};

export type PluginManagerOptions<OS extends OverlaySettings, CS extends object> = {
  defaultPlugin: OverlayPluginConstructor<CS>;
  settingsManager: SettingsManager<OS>;
  renderOptions: RenderOptions;
};

// Bootstrapping

export type BootstrapOptions<OS extends OverlaySettings, CS extends object> = {
  renderOptions: RenderOptions;
  needsSettingsRenderer: boolean;
  needsOverlayRenderer: boolean;
  settingsValidator: SettingsValidator<OS>;
  defaultPlugin: OverlayPluginConstructor<CS>;
};

// Overlay Instance

export type OverlaySettings = {
  channelName?: string;
  plugins?: string[];
  customPlugins?: string;
};

// Renderers

export type RenderOptions = {
  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;
};

export type RendererInstanceOptions<OS extends OverlaySettings, CS extends object> = {
  pluginManager: PluginManager<OS, CS>;
  settingsManager: SettingsManager<OS>;
  errorManager: ErrorManager;
  renderOptions: RenderOptions;
};

export type RendererInstance<CS extends object> = {
  init(): Promise<void>;
  middleware?(ctx: CS): Promise<CS> | CS;
};

export type RendererConstructor<OS extends OverlaySettings, CS extends object> = {
  new (options: RendererInstanceOptions<OS, CS>): RendererInstance<CS>;
};

// Plugins

export type OverlayPluginInstance<CS extends object> = {
  name: string;
  bus: EnhancedEventEmitter;
  priority?: number;
  unregister?(renderOptions: RenderOptions): void;
  injectSettingsSchema?(injector: SettingsInjector): void;
  renderSettings?(renderOptions: RenderOptions): void;
  renderOverlay?(renderOptions: RenderOptions): void;
  middleware?(ctx: CS): Promise<CS> | CS;
};

export type OverlayPluginConstructor<CS extends object> = {
  new (bus: EnhancedEventEmitter): OverlayPluginInstance<CS>;
};
