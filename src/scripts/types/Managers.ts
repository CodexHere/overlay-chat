import { Listener } from 'events';
import { PluginManager } from '../managers/PluginManager.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { ContextBase } from './Middleware.js';
import { PluginConstructor, PluginInstance, PluginOptions, PluginRegistrar, PluginSettingsBase } from './Plugin.js';

export type RenderOptions = {
  elements?: Record<string, HTMLElement>;
  templates?: Record<string, HandlebarsTemplateDelegate<any>>;
};

// Bootstrapping

export type BootstrapOptions<OS extends PluginSettingsBase> = {
  renderOptions: RenderOptions;
  needsSettingsRenderer: boolean;
  needsOverlayRenderer: boolean;
  defaultPlugin: PluginConstructor<OS>;
};

// SettingsManager

export type SettingsValidatorResult<OS extends PluginSettingsBase> = true | Partial<Record<keyof OS, string>>;
export type SettingsValidatorResults<OS extends PluginSettingsBase> = true | SettingsValidatorResult<OS>;

// PluginManager

export type PluginManagerOptions<OS extends PluginSettingsBase> = {
  defaultPlugin: PluginConstructor<OS>;
  getSettings: () => OS;
  pluginRegistrar: PluginRegistrar<OS>;
  pluginOptions: PluginOptions<OS>;
};

export enum PluginManagerEvents {
  LOADED = 'plugins::loaded',
  UNLOADED = 'plugins::unloaded'
}

export type PluginManagerEmitter<OS extends PluginSettingsBase> = PluginManager<OS> & {
  emit(eventType: PluginManagerEvents.LOADED): boolean;
  addListener(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<OS>;
  on(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<OS>;

  emit(eventType: PluginManagerEvents.UNLOADED): boolean;
  addListener(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<OS>;
  on(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<OS>;
};

// BusManager

export type BusManagerContext_Init<Context extends ContextBase> = {
  chainName: string;
  initialContext: Context;
  initiatingPlugin: PluginInstance<PluginSettingsBase>;
};

export enum BusManagerEvents {
  MIDDLEWARE_EXECUTE = 'middleware-execute'
}

export type BusManagerEmitter = EnhancedEventEmitter & {
  addListener(eventType: BusManagerEvents, listener: Listener): void;
  on(eventType: BusManagerEvents, listener: Listener): void;

  emit<Context extends ContextBase>(
    eventType: typeof BusManagerEvents.MIDDLEWARE_EXECUTE,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): void;
};

// Error Manager

export type ErrorManager = {
  showError(err: Error | Error[]): void;
};
