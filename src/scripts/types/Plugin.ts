/**
 * Types for Plugins
 * 
 * @module
 */

import { Listener } from 'events';
import { FormValidatorResults } from '../utils/Forms.js';
import { MiddlewareLink } from '../utils/Middleware.js';
import { TemplateMap } from '../utils/Templating.js';
import { DefaultQueryString } from '../utils/URI.js';
import { BusManagerEmitter, DisplayManager } from './Managers.js';

/**
 * A collection of {@link PluginInstance | `PluginInstance`} objects, which are expected to be fully Registered.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginInstances<PluginSettings extends PluginSettingsBase> = PluginInstance<PluginSettings>[];

/**
 * A single URLs to dynamically import, or an instance of {@link PluginConstructor | `PluginConstructor`} to instantiate as necessary.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginLoader<PluginSettings extends PluginSettingsBase> = string | PluginConstructor<PluginSettings>;

/**
 * A collection of {@link PluginConstructor | `PluginConstructor`}s.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginLoaders<PluginSettings extends PluginSettingsBase> = Set<PluginLoader<PluginSettings>>;

/**
 * A Good vs Bad mapping the results of a collection of Plugin Importing.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginImportResults<PluginSettings extends PluginSettingsBase> = {
  /** Plugins marked as imported successfully. */
  good: PluginInstance<PluginSettings>[];
  /** Errors from failed attempts at importing Plugins. */
  bad: Error[];
};

/**
 * Mapping of Middleware Chain Name to an array of Middleware Link Handlers.
 */
export type PluginMiddlewareMap = Record<string, MiddlewareLink<{}>[]>;

/**
 * Accessors that are injected into Plugins for Registering various functionalities of a Plugin.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginRegistrar<PluginSettings extends PluginSettingsBase> = {
  /**
   * Register Middleware with the system.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param queriedMiddleware - Middleware Chain Mapping to register with the Plugin instance.
   */
  registerMiddleware(plugin: PluginInstance<PluginSettings>, queriedMiddleware: PluginMiddlewareMap | undefined): void;

  /**
   * Register Events with the system.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param eventMap - Event Mapping to register with the Plugin instance.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  registerEvents(plugin: PluginInstance<PluginSettings>, eventMap?: PluginEventMap): void;

  /**
   * Register a Settings Schema with the system.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param registration - The Plugin Instance's Registration Options.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  registerSettings(plugin: PluginInstance<PluginSettings>, registration?: PluginRegistrationOptions): Promise<void>;

  /**
   * Register a Template HTML file with the sytem.
   *
   * @param templateUrl - URL of the Template HTML file to Register.
   */
  registerTemplates(templateUrl?: URL): void;

  /**
   * Register a Stylesheet file with the sytem.
   *
   * @param href - URL of the Template HTML file to Register.
   */
  registerStylesheet: (href: URL) => void;
};

/**
 * Base Settings available to Plugins.
 *
 * Extend this type to generate your own typings for Plugin Settings.
 */
export type PluginSettingsBase = DefaultQueryString & {
  /** Force the {@link AppBootstrapper.AppBootstrapper | `AppBootstrapper`} to show Settings Renderer */
  forceShowSettings?: boolean;
  /** Collection of Names of Built-In Plugins */
  plugins?: string | string[];
  /** Collection of URLs of Remote/Custom Plugins */
  customPlugins?: string | string[];
};

/**
 * Mapping of Event Name to Listener for the Plugin Registering.
 */
export type PluginEventMap = Record<string, Listener>;

/**
 * Mapping of Sends vs Recieves for Meta purposes, as well as Registering via {@link PluginManager | `PluginManager`}.
 */
export type PluginEventRegistration = {
  /** These are the Event Names and Handlers this Plugin can expect to Recieve. */
  recieves?: PluginEventMap;
  /** These are the Event Names this Plugin can be expected to Send. */
  sends?: string[];
};

/**
 * TODO: Refactor away from this concept some.. See `README.md`.
 * @deprecated
 */
export type PluginRegistrationOptions = {
  middlewares?: PluginMiddlewareMap;
  events?: PluginEventRegistration;
  settings?: URL;
  templates?: URL;
  stylesheet?: URL;
};

/**
 * Accessors for Plugin Runtime Lifecycles.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginOptions<PluginSettings extends PluginSettingsBase> = {
  /** Accessor Function for Settings */
  getSettings: () => PluginSettings;
  /** Accessor Function for Event Emitter */
  // TODO: Change to actual Accessor Function to match other items
  emitter: Readonly<BusManagerEmitter>;
  /**
   * Accessor Function for Templates
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  getTemplates: <TemplateIDs extends string>() => TemplateMap<TemplateIDs>;
  /** Accessor Function for Display Manager */
  // TODO: Change to actual Accessor Function to match other items
  // TODO: Rename away from `errorDisplay`
  errorDisplay: DisplayManager;
};

/**
 * Static Typing of a Plugin Class.
 *
 * > NOTE: A Plugin should have a `constructor` that matches this signature!
 */
export type PluginConstructor<PluginSettings extends PluginSettingsBase> = {
  new (options: PluginOptions<PluginSettings>): PluginInstance<PluginSettings>;
};

/**
 * Instance Typing of a Plugin.
 */
export type PluginInstance<PluginSettings extends PluginSettingsBase> = {
  /** Name of the Plugin. Often used for Display purposes, but also can be mutated for uniqueness. */
  name: string;
  /** Version of the Plugin. */
  version: string;
  /** Reference Symbole for the Plugin. This is used for security/tracking Plugin access to things like the Event Bus or Middleware Executor. */
  ref: Symbol;
  /** A number representing the Priority of the Plugin. Lower Priority values load/operate sooner than Higher Priority values. If not specified, Priority is after all *specified* Priority Plugins, in the order they were given to Load. */
  priority?: number;

  /**
   * Optionally define this method to intake {@link PluginRegistrationOptions | `PluginRegistrationOptions`} and Register various aspects of a Plugin.
   */
  registerPlugin?(): PluginRegistrationOptions | Promise<PluginRegistrationOptions>;

  /**
   * Optionally define this method to perform various unregistration actions when a Plugin is being unloaded.
   */
  unregisterPlugin?(): void | Promise<void>;

  /**
   * Optionally define this method to evaluate the current settings for whether the Plugin is "Configured" or not.
   */
  isConfigured?(): FormValidatorResults<PluginSettings>;

  /**
   * @deprecated
   * @param forceSyncSettings - A method that can be called when a Plugin manipulates Settings on behalf of the user.
   * TODO: This might go away, as we move to injecting a RegistrationContext into the plugin
   * TODO: Instead of injecting a function, let's event this
   */
  renderSettings?(forceSyncSettings: () => void): void;

  /**
   * @deprecated
   * TODO: This might go away, as we move to injecting a RegistrationContext into the plugin
   */
  renderApp?(): void;
};
