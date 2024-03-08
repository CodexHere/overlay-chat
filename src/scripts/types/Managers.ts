/**
 * Types for all the `Manager` classes used throughout the Application Lifecycle
 *
 * @module
 */

import { AppBootstrapper } from '../AppBootstrapper.js';
import { DisplayContextProvider } from '../ContextProviders/DisplayContextProvider.js';
import { StylesheetsContextProvider } from '../ContextProviders/StylesheetsContextProvider.js';
import { BusManager } from '../Managers/BusManager.js';
import { PluginManager } from '../Managers/PluginManager.js';
import { SettingsManager } from '../Managers/SettingsManager.js';
import { TemplateManager } from '../Managers/TemplateManager.js';
import { AppBootstrapperEmitter, PluginManagerEmitter, SettingsManagerEmitter } from './Events.js';
import { PluginConstructor, PluginInstance, PluginSettingsBase } from './Plugin.js';
import { RenderMode } from './Renderers.js';

/**
 * Most Managers will need to implement `LockHolder` to isolate certain
 * features to Registration vs Runtime phases.
 */
export type LockHolder = {
  /** Semaphore indicating Lock status. When Locked, Registration and Config-only access like manipulating Settings are unavailable. */
  isLocked: boolean;
  /** Which `<mode>` to Render (for Plugins). */
  renderMode: RenderMode;
};

/**
 * Options for initializing the {@link AppBootstrapper | `AppBootstrapper`}.
 */
export type AppBootstrapperOptions = {
  /** Initial and Default Plugin to load upon initialization. */
  defaultPlugin: PluginConstructor;
  /** Tells the bootstrapper whether the Application needs a Settings Renderer */
  needsConfigurationRenderer?: true;
  /** Tells the bootstrapper whether the Application needs an Application Renderer */
  needsAppRenderer?: true;
};

/**
 * Settings Mode for how to store/retrieve Settings Values.
 */
export type SettingsMode = 'raw' | 'encrypted' | 'decrypted';

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
 * Options for initializing the {@link LifecycleManager | `LifecycleManager`}.
 */
export type LifecycleManagerOptions = {
  bootstrapper: AppBootstrapperEmitter;
  bus: BusManager;
  display: DisplayContextProvider;
  plugin: PluginManagerEmitter;
  settings: SettingsManagerEmitter;
  stylesheets: StylesheetsContextProvider;
  template: TemplateManager;
};
