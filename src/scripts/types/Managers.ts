/**
 * Types for all the `Manager` classes used throughout the Application Lifecycle
 * 
 * @module
 */

import { Listener } from 'events';
import { AppBootstrapper } from '../AppBootstrapper.js';
import { BusManager } from '../managers/BusManager.js';
import { PluginManager } from '../managers/PluginManager.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { PluginConstructor, PluginInstance, PluginOptions, PluginRegistrar, PluginSettingsBase } from './Plugin.js';

// Bootstrapping

/**
 * Options for initializing the {@link AppBootstrapper | `AppBootstrapper`}.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type AppBootstrapperOptions<PluginSettings extends PluginSettingsBase> = {
  /** Initial and Default Plugin to load upon initialization. */
  defaultPlugin: PluginConstructor<PluginSettings>;

  /** Tells the bootstrapper whether the Application needs a Settings Renderer */
  needsSettingsRenderer?: true;
  /** Tells the bootstrapper whether the Application needs an App Renderer */
  needsAppRenderer?: true;
};

// PluginManager

/**
 * Options for initializing the {@link PluginManager | `PluginManager`}.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginManagerOptions<PluginSettings extends PluginSettingsBase> = {
  /** Initial and Default Plugin to load upon initialization. */
  defaultPlugin: PluginConstructor<PluginSettings>;
  /** Accessor Function for Settings */
  getSettings: () => PluginSettings;
  /** Available Accessor Functions for Registering a Plugin */
  pluginRegistrar: PluginRegistrar<PluginSettings>;
  /** Available Accessor Functions for a Plugin's Lifecycle */
  pluginOptions: PluginOptions<PluginSettings>;
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
export type PluginManagerEmitter<PluginSettings extends PluginSettingsBase> = PluginManager<PluginSettings> & {
  emit(eventType: PluginManagerEvents.LOADED): boolean;
  addListener(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.LOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;

  emit(eventType: PluginManagerEvents.UNLOADED): boolean;
  addListener(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
  on(eventType: PluginManagerEvents.UNLOADED, listener: Listener): PluginManagerEmitter<PluginSettings>;
};

// BusManager

/**
 * When a MiddlewareChain is executed, this special Context is used to initiate the hain, by
 * targeting the name of the Chain. This structure also defines the initial context value, and
 * mark the plugin as initiating the execution request.
 *
 * @typeParam Context - Shape of the Context State each Link recieves to mutate.
 */
export type BusManagerContext_Init<Context extends {}> = {
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

// Display Manager

/**
 * Display Manager is responsible for showing Errors and Info messages to the User.
 */
export type DisplayManager = {
  /** Shows an dismissable Error to the User. */
  showError(err: Error | Error[]): void;
  /** Shows an dismissable Message to the User. */
  showInfo(message: string, title?: string): void;
};
