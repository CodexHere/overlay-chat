/**
 * Types for Plugins
 *
 * @module
 */

import { Listener } from 'events';
import { FormValidatorResults } from '../utils/Forms/types.js';
import { MiddlewareLink } from '../utils/Middleware.js';
import { DefaultQueryString } from '../utils/URI.js';
import { ContextProviders } from './ContextProviders.js';

/**
 * A collection of {@link PluginInstance | `PluginInstance`} objects, which are expected to be fully Registered.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginInstances<PluginSettings extends PluginSettingsBase = {}> = PluginInstance<PluginSettings>[];

/**
 * A single URLs to dynamically import, or an instance of {@link PluginConstructor | `PluginConstructor`} to instantiate as necessary.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginLoader = string | PluginConstructor;

/**
 * A collection of {@link PluginConstructor | `PluginConstructor`}s.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginLoaders = Set<PluginLoader>;

/**
 * A Good vs Bad mapping the results of a collection of Plugin Importing.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type PluginImportResults = {
  /** Plugins marked as imported successfully. */
  good: PluginInstances;
  /** Errors from failed attempts at importing Plugins. */
  bad: Error[];
};

/**
 * Mapping of Middleware Chain Name to an array of Middleware Link Handlers.
 */
export type PluginMiddlewareMap<Context extends {} = {}> = Record<string, MiddlewareLink<Context>[]>;

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
 * Static Typing of a Plugin Class.
 */
export type PluginConstructor = {
  new (): PluginInstance;
};

/**
 * Instance Typing of a Plugin.
 */
export type PluginInstance<PluginSettings extends PluginSettingsBase = {}> = {
  /** Name of the Plugin. Often used for Display purposes, but also can be mutated for uniqueness. */
  name: string;
  /** Version of the Plugin. */
  version: string;
  /** Reference Symbol for the Plugin. This is used for security/tracking Plugin access to things like the Event Bus or Middleware Executor. */
  ref: Symbol;
  /** A number representing the Priority of the Plugin. Lower Priority values load/operate sooner than Higher Priority values. If not specified, Priority is after all *specified* Priority Plugins, in the order they were given to Load. */
  priority?: number;
  /** Author Metadata for the Plugin. Can be a Handle, X/Discord/Github Profile, etc. */
  author?: string;
  /** Support/Marketing Homepage. Can be a Discord/Github Repository, etc. */
  homepage?: string;

  /**
   * Define this method to intake a {@link types/ContextProviders | `ContextProviders`} and have access to various `Context`s when Registering
   * your Plugin.
   */
  register(ctx: ContextProviders): Promise<void>;

  /**
   * Optionally define this method to perform various unregistration actions when a Plugin is being Unregistered.
   */
  unregister?(): void | Promise<void>;

  /**
   * Optionally define this method to evaluate the current settings for whether the Plugin is "Configured" or not.
   */
  isConfigured?(): FormValidatorResults<PluginSettings>;
};
