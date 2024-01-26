import { Listener } from 'events';
import { BusManager } from './managers/BusManager.js';
import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { EnhancedEventEmitter } from './utils/EnhancedEventEmitter.js';
import { FormEntryFieldGroup } from './utils/Forms.js';
import { Middleware } from './utils/Middleware.js';

export type ContextBase = {
  runningErrors: Error[];
};

// Managers

export type ErrorManager = {
  showError(err: Error | Error[]): void;
};

export type SettingsInjector = (fieldGroup: FormEntryFieldGroup) => void;
export type SettingsRetriever<OS extends OverlaySettings> = () => OS;
export type SettingsValidator<OS extends OverlaySettings> = (settings: OS) => boolean;
export type SettingsManagerOptions<OS extends OverlaySettings> = {
  settingsValidator: SettingsValidator<OS>;
  locationHref: string;
};

export type PluginInstances = OverlayPluginInstance[];
export type PluginLoaders<OS extends OverlaySettings> = Array<string | OverlayPluginConstructor<OS>>;
export type PluginImports = {
  good: OverlayPluginInstance[];
  bad: Error[];
};
export type PluginManagerOptions<OS extends OverlaySettings> = {
  defaultPlugin: OverlayPluginConstructor<OS>;
  renderOptions: RenderOptions;
  settingsManager: SettingsManager<OS>;
  busManager: BusManager;
  errorManager: ErrorManager;
};

export type BusManagerContext_Init<Context extends ContextBase> = {
  chainName: string;
  initialContext: Context;
  initiatingPlugin: OverlayPluginInstance;
};

export enum BusManagerEvents {
  MIDDLEWARE_EXECUTE = 'middleware-execute'
}

export type BusManagerEmitter = EnhancedEventEmitter & {
  on(eventType: BusManagerEvents, listener: Listener): void;

  emit<Context extends ContextBase>(
    eventType: typeof BusManagerEvents.MIDDLEWARE_EXECUTE,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): void;
};

// Bootstrapping

export type BootstrapOptions<OS extends OverlaySettings> = {
  renderOptions: RenderOptions;
  needsSettingsRenderer: boolean;
  needsOverlayRenderer: boolean;
  settingsValidator: SettingsValidator<OS>;
  defaultPlugin: OverlayPluginConstructor<OS>;
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

export type RendererInstanceOptions<OS extends OverlaySettings> = {
  pluginManager: PluginManager<OS>;
  settingsManager: SettingsManager<OS>;
  errorManager: ErrorManager;
  renderOptions: RenderOptions;
};

export type RendererInstance = {
  init(): Promise<void>;
};

export type RendererConstructor<OS extends OverlaySettings> = {
  new (options: RendererInstanceOptions<OS>): RendererInstance;
};

// Plugins

export type OverlayPluginInstance = {
  name: string;
  ref: Symbol;
  emitter: BusManagerEmitter;
  priority?: number;
  unregisterPlugin?(renderOptions: RenderOptions): void;
  registerPluginMiddleware?(): Map<string, Middleware<ContextBase>[]>;
  registerPluginSettings?(): FormEntryFieldGroup;

  renderSettings?(renderOptions: RenderOptions): void;
  renderOverlay?(renderOptions: RenderOptions): void;
};

export type OverlayPluginConstructor<OS extends OverlaySettings> = {
  new (emitter: BusManagerEmitter, getSettings: SettingsRetriever<OS>): OverlayPluginInstance;
};

// Misc

export const BOOLEAN_TRUES = ['true', 'yes', 't', 'y', 'on', 'enable', 'enabled'];
export const BOOLEAN_FALSES = ['false', 'no', 'f', 'n', 'off', 'disable', 'disabled'];
