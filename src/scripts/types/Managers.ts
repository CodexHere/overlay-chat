/**
 * Types for all the `Manager` classes used throughout the Application Lifecycle
 *
 * @module
 */

import { Listener } from 'events';
import { AppBootstrapper } from '../AppBootstrapper.js';
import { DisplayContextProvider } from '../ContextProviders/DisplayContextProvider.js';
import { StylesheetsContextProvider } from '../ContextProviders/StylesheetsContextProvider.js';
import { BusManager } from '../Managers/BusManager.js';
import { PluginManager } from '../Managers/PluginManager.js';
import { SettingsManager } from '../Managers/SettingsManager.js';
import { TemplateManager } from '../Managers/TemplateManager.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { PluginConstructor, PluginInstance, PluginSettingsBase } from './Plugin.js';

/**
 * Options for initializing the {@link AppBootstrapper | `AppBootstrapper`}.
 */
export type AppBootstrapperOptions = {
  /** Initial and Default Plugin to load upon initialization. */
  defaultPlugin: PluginConstructor;
  /** Tells the bootstrapper whether the Application needs a Settings Renderer */
  needsSettingsRenderer?: true;
  /** Tells the bootstrapper whether the Application needs an Application Renderer */
  needsAppRenderer?: true;
};

/**
 * Options for initializing the {@link PluginManager | `PluginManager`}.
 */
export type PluginManagerOptions = {
  /** Initial and Default Plugin to load upon initialization. */
  defaultPlugin: PluginConstructor;

  /**
   * Managers to access various parts of the Application,
   * and to inject Contexts into Plugins.
   */
  managers: {
    bus: BusManager;
    template: TemplateManager;
    settings: SettingsManager;
    display: DisplayContextProvider;
    stylesheets: StylesheetsContextProvider;
  };
};

/**
 * Events that the {@link PluginManager | `PluginManager`} Emits.
 */
export enum PluginManagerEvents {
  /** Fired when all Plugins have been Loaded */
  LOADED = 'plugins::loaded',
  /** Fired when all Plugins have been Unloaded */
  UNLOADED = 'plugins::unloaded'
}

/**
 * Events that the {@link PluginManager | `PluginManager`} Emits.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginManagerEmitter<PluginSettings extends PluginSettingsBase> = PluginManager & {
  emit(eventType: PluginManagerEvents.LOADED): boolean;
  addListener(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;

  emit(eventType: PluginManagerEvents.UNLOADED): boolean;
  addListener(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
};

/**
 * When a MiddlewareChain is executed, this special Context is used to initiate the hain, by
 * targeting the name of the Chain. This structure also defines the initial context value, and
 * mark the plugin as initiating the execution request.
 *
 * @typeParam Context - Shape of the Context State each Link recieves to mutate.
 */
export type BusManagerContext_Init<Context extends {} = {}> = {
  chainName: string;
  initialContext: Context;
  initiatingPlugin: PluginInstance<PluginSettingsBase>;
};

/**
 * Events that the {@link BusManager | `BusManager`} Emits.
 */
export enum BusManagerEvents {
  MIDDLEWARE_EXECUTE = 'middleware-execute'
}

/**
 * Events that the {@link BusManager | `BusManager`} Emits.
 */
export type BusManagerEmitter = EnhancedEventEmitter & {
  addListener(eventType: BusManagerEvents, listener: Listener): void;
  on(eventType: BusManagerEvents, listener: Listener): void;

  emit<Context extends {}>(
    eventType: typeof BusManagerEvents.MIDDLEWARE_EXECUTE,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): void;
};
