import { Listener } from 'events';
import { PluginManager } from '../managers/PluginManager.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { PluginConstructor, PluginInstance, PluginOptions, PluginRegistrar, PluginSettingsBase } from './Plugin.js';

export type TemplateMap = Record<string, HandlebarsTemplateDelegate<any>>;

// Bootstrapping

export type BootstrapOptions<PluginSettings extends PluginSettingsBase> = {
  defaultPlugin: PluginConstructor<PluginSettings>;

  needsSettingsRenderer?: true;
  needsAppRenderer?: true;
  rootContainer: HTMLElement;
  templateFile?: URL;
};

// SettingsManager

export type SettingsValidatorResult<PluginSettings extends PluginSettingsBase> =
  | true
  | Partial<Record<keyof PluginSettings, string>>;
export type SettingsValidatorResults<PluginSettings extends PluginSettingsBase> =
  | true
  | SettingsValidatorResult<PluginSettings>;

// PluginManager

export type PluginManagerOptions<PluginSettings extends PluginSettingsBase> = {
  defaultPlugin: PluginConstructor<PluginSettings>;
  getSettings: () => PluginSettings;
  pluginRegistrar: PluginRegistrar<PluginSettings>;
  pluginOptions: PluginOptions<PluginSettings>;
};

export enum PluginManagerEvents {
  LOADED = 'plugins::loaded',
  UNLOADED = 'plugins::unloaded'
}

export type PluginManagerEmitter<PluginSettings extends PluginSettingsBase> = PluginManager<PluginSettings> & {
  emit(eventType: PluginManagerEvents.LOADED): boolean;
  addListener(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;

  emit(eventType: PluginManagerEvents.UNLOADED): boolean;
  addListener(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
};

// BusManager

export type BusManagerContext_Init<Context extends {}> = {
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

  emit<Context extends {}>(
    eventType: typeof BusManagerEvents.MIDDLEWARE_EXECUTE,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): void;
};

// Error Manager

export type ErrorManager = {
  showError(err: Error | Error[]): void;
};
