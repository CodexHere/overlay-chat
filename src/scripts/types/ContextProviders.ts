/**
 * Context Provider Typings
 *
 * @module
 */

import { Listener } from 'events';
import { FormSchemaEntry, ProcessedFormSchema } from '../utils/Forms/types.js';
import { TemplateIDsBase, TemplateMap } from '../utils/Templating.js';
import { CoreEvents } from './Events.js';
import { BusManagerContext_Init } from './Managers.js';
import { PluginEventRegistration, PluginInstance, PluginMiddlewareMap, PluginSettingsBase } from './Plugin.js';

/**
 * Context Provider for Settings.
 */
export type ContextProvider_Settings = {
  /**
   * Unregister a Plugin from the Application.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void;

  /**
   * Registers a {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} File for a Plugin.
   *
   * > The file should be a single {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} in a properly formatted JSON file.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param schemaUrl - URL of the {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} to load as JSON.
   */
  register(plugin: PluginInstance, schemaUrl: URL): Promise<void>;

  /**
   * Get the Settings for the Application.
   *
   * @param mode - Determines whether to return the Settings as stored (raw), encrypted, or decrypted.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  get<PluginSettings extends PluginSettingsBase>(mode?: 'raw' | 'encrypted' | 'decrypted'): PluginSettings;

  /**
   * Get Settings object for a specific Plugin's Registration.
   *
   * > Also includes built-in Settings.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param mode - Which mode to retrieve Settings in: raw, encrypted, or decrypted. Default is *raw*.
   */
  getFor<PluginSettings extends PluginSettingsBase>(
    plugin: PluginInstance,
    mode: 'raw' | 'encrypted' | 'decrypted'
  ): PluginSettings | null;

  /**
   * Retrieve the aggregate {@link ProcessedFormSchema | `ProcessedFormSchema`} for all Plugins.
   */
  getProcessedSchema(): ProcessedFormSchema | null;

  /**
   * Set the Settings wholesale as an entire object.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase, except in `configure` Render Mode.
   *
   * @param settings - Data to set as Settings.
   * @param encrypt - Whether to encrypt on storing Settings. //! TODO: Is this necessary? Shouldn't we just treat settings as raw, ALWAYS? then we can decrypt for access?
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  set<PluginSettings extends PluginSettingsBase>(settings: PluginSettings, encrypt: boolean): void;

  /**
   * Set a value for a specific Settings Name.
   *
   * Will Auto Encrypt depending on `inputType` of associative {@link utils/Forms/types.FormSchemaEntryBase | `FormSchemaEntryBase`}.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase, except in `configure` Render Mode.
   *
   * @param settingName - Settings Name which to set/replace a value.
   * @param value - Value to set/replace for the Settings Name.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  set<PluginSettings extends PluginSettingsBase>(settingName: keyof PluginSettings, value: any): void;

  /**
   * Merge Settings as an object.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase, except in `configure` Render Mode.
   *
   * @param settings - Data to merge as Settings.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  merge<PluginSettings extends PluginSettingsBase>(settings: PluginSettings): void;

  /**
   *
   * @param settingName - Name of the Setting to supply an overridden {@link FormSchemaEntry | `FormSchemaEntry`}.
   * @param newSchema - New {@link FormSchemaEntry | `FormSchemaEntry`} for the `settingName`.
   */
  overrideSettingSchema<PluginSettings extends PluginSettingsBase>(
    settingName: keyof PluginSettings,
    newSchema: Partial<FormSchemaEntry>
  ): void;
};

/**
 * Context Provider for Templates.
 */
export type ContextProvider_Template = {
  /**
   * Unregister a Plugin from the Application.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void;

  /**
   * Registers a Template File for a Plugin.
   *
   * > The file should be a collection of `<template>` tags with IDs set.
   * > They will be processed to be mapped as ID -> Template Delegate Function.
   * 
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param templateUrl - URL of the Template HTML file to load.
   */
  register(plugin: PluginInstance, templateUrl: URL): Promise<void>;

  /**
   * Get the Template Map.
   *
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  get<TemplateIDs extends string>(): TemplateMap<TemplateIDs>;

  /**
   * Get a Template by ID.
   *
   * This ID is the one in the `<template>` tag in the loaded file.
   *
   * @param id - ID of Template to retrieve.
   */
  getId<TemplateIDs extends string>(id: TemplateIDs | TemplateIDsBase): HandlebarsTemplateDelegate<any>;
};

/**
 * Context Provider for the Application Bus.
 */
export type ContextProvider_Bus = {
  /**
   * Unregister a Plugin from the Application.
   *
   * Removes known Registered Listeners, and the registered Links for Chains.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void;

  /**
   * Register Sends/Recieves for Events with the Application.
   *
   * > Events are forcibly added from the given mapping, and will bind to the {@link PluginInstance | `PluginInstance`}.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the Sends/Recieves declarations for the Plugin.
   */
  registerEvents(plugin: PluginInstance, registrationMap: PluginEventRegistration): void;

  /**
   * Register Middleware Links for Chains with the Application.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the MiddlewareMap declarations for the Plugin.
   */
  registerMiddleware(plugin: PluginInstance, registrationMap: PluginMiddlewareMap): void;

  /**
   * Proxy `emit` to the Application Emitter when a Plugin wants to Execute a {@link utils/Middleware.MiddlewareChain | `MiddlewareChain`}.
   *
   * @param eventType - Event Type to `emit`.
   * @param ctx - Middleware Chain Execution Initial Context object.
   * @typeParam Context - Shape of the Context State each Link recieves to mutate.
   */
  emit<Context extends {}>(
    eventType: typeof CoreEvents.MiddlewareExecute,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): void;

  /**
   * Proxy `emit` to the Application Emitter when Settings need synchronization after
   * a Plugin updates Settings on behalf of the User.
   *
   * @param eventType - Event Type to `emit`.
   * @param listener - Event Handler.
   */
  emit(eventType: typeof CoreEvents.SyncSettings, listener: Listener): void;

  /**
   * Proxy `emit` to the Application Emitter.
   *
   * @param type - Event Type to `emit`.
   * @param args - Arguments to pass to the Event Listener.
   */
  emit(type: string | number, ...args: any[]): void;

  /**
   * Proxy `call` to the Application Emitter.
   *
   * Unlike your standard `emit`, this will attempt to capture the responses of all handlers and return them!
   * This is pretty hacky, but could be useful.
   *
   * @param type - Event Type to `call`.
   * @param args - Arguments to pass to the Event Listener.
   * @typeParam ReturnType - Expected return type, assuming all callback returns are homogenous.
   */
  call<ReturnType>(type: string | number, ...args: any[]): ReturnType[];
};

/**
 * Context Provider for Stylesheets.
 */
export type ContextProvider_Stylesheets = {
  /**
   * Unregister Stylesheets for a Plugin.
   *
   * Removes `<link>` tag with matching *data-attribute* for the Plugin.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void;

  /**
   * Registers a Stylesheet for a Plugin.
   *
   * Adds a *data-attribute* to associate with this Plugin, for Unregistering later.
   *
   * > NOTE: This is only available during the Plugin Registration phase of the Application,
   * > and cannot be accessed during the Runtime phase.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param styleSheetUrl - URL of the Stylesheet to load.
   */
  register(plugin: PluginInstance, styleSheetUrl: URL): void;
};

/**
 * Context Provider for Display.
 */
export type ContextProvider_Display = {
  /**
   * Display an Info message to the User.
   *
   * @param message - Message to display to the User.
   * @param title - Title of modal dialogue.
   */
  showInfo(message: string, title?: string): void;

  /**
   * Display an `Error` message to the User.
   *
   * @param err - The `Error`, or collection of `Error`s, to present to the User.
   */
  showError(err: Error | Error[]): void;
};

/**
 * Context Providers that are used throughout Application and Plugin Lifecycle.
 */
export type ContextProviders = {
  bus: ContextProvider_Bus;
  display: ContextProvider_Display;
  settings: ContextProvider_Settings;
  stylesheets: ContextProvider_Stylesheets;
  template: ContextProvider_Template;
};
