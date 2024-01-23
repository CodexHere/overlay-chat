import { Middleware } from '@digibear/middleware';
import { Listener } from 'events';
import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { EnhancedEventEmitter } from './utils/EnhancedEventEmitter.js';
import { FormEntryFieldGroup } from './utils/Forms.js';

export type ContextBase = {
  errors: Error[];
};

// Managers

export type SettingsInjector = (fieldGroup: FormEntryFieldGroup) => void;
export type SettingsRetriever<OS extends OverlaySettings> = () => OS;
export type SettingsValidator<OS extends OverlaySettings> = (settings: OS) => boolean;

export enum PluginManagerEvents {
  MIDDLEWARE_EXECUTE = 'middleware-execute'
}

export type PluginManagerBus = EnhancedEventEmitter & {
  on(eventType: PluginManagerEvents, listener: Listener): void;
  emit(eventType: PluginManagerEvents, ...args: any[]): boolean;
};

export type PluginLoaders<OS extends OverlaySettings, Context extends ContextBase> = Array<
  string | OverlayPluginConstructor<OS, Context>
>;
export type PluginInstances<Context extends ContextBase> = OverlayPluginInstance<Context>[];

export type PluginImports<Context extends ContextBase> = {
  good: OverlayPluginInstance<Context>[];
  bad: Error[];
};

export type ErrorManager = {
  showError(err: Error | Error[]): void;
};

export type SettingsManagerOptions<OS extends OverlaySettings> = {
  settingsValidator: SettingsValidator<OS>;
  locationHref: string;
};

export type PluginManagerOptions<OS extends OverlaySettings, Context extends ContextBase> = {
  defaultPlugin: OverlayPluginConstructor<OS, Context>;
  renderOptions: RenderOptions;
  settingsManager: SettingsManager<OS, Context>;
  errorManager: ErrorManager;
};

// Bootstrapping

export type BootstrapOptions<OS extends OverlaySettings, Context extends ContextBase> = {
  renderOptions: RenderOptions;
  needsSettingsRenderer: boolean;
  needsOverlayRenderer: boolean;
  settingsValidator: SettingsValidator<OS>;
  defaultPlugin: OverlayPluginConstructor<OS, Context>;
};

// Overlay Instance

export type OverlaySettings = {
  forceShowSettings?: boolean;
  plugins?: string[];
  customPlugins?: string;
};

// Renderers

export type RenderOptions = {
  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;
};

export type RendererInstanceOptions<OS extends OverlaySettings, Context extends ContextBase> = {
  pluginManager: PluginManager<OS, Context>;
  settingsManager: SettingsManager<OS, Context>;
  errorManager: ErrorManager;
  renderOptions: RenderOptions;
};

export type RendererInstance = {
  init(): Promise<void>;
};

export type RendererConstructor<OS extends OverlaySettings, Context extends ContextBase> = {
  new (options: RendererInstanceOptions<OS, Context>): RendererInstance;
};

// Plugins

export type OverlayPluginInstance<Context extends ContextBase> = {
  name: string;
  bus: EnhancedEventEmitter;
  priority?: number;
  unregister?(renderOptions: RenderOptions): void;
  getSettingsSchema?(): FormEntryFieldGroup;
  renderSettings?(renderOptions: RenderOptions): void;
  renderOverlay?(renderOptions: RenderOptions): void;
  middleware?: Middleware<Context>;
};

export type OverlayPluginConstructor<OS extends OverlaySettings, Context extends ContextBase> = {
  new (bus: EnhancedEventEmitter, getSettings: SettingsRetriever<OS>): OverlayPluginInstance<Context>;
};

// Misc

export const BOOLEAN_TRUES = ['true', 'yes', 't', 'y', 'on', 'enable', 'enabled'];
export const BOOLEAN_FALSES = ['false', 'no', 'f', 'n', 'off', 'disable', 'disabled'];
