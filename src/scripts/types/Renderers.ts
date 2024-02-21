/**
 * Types for Renderers
 *
 * @module
 */

import { FormValidatorResults, ParsedJsonResults } from '../utils/Forms.js';
import { TemplateMap } from '../utils/Templating.js';
import { DisplayManager } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

/**
 * Options for initializing the {@link RendererInstance | `RendererInstance`}.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type RendererInstanceOptions<PluginSettings extends PluginSettingsBase> = {
  /** Accessor Function to get the Parsed JSON Results of processing a {@link FormEntry | `FormEntry[]`}. */
  getParsedJsonResults?: () => ParsedJsonResults | undefined;
  /** Action Function to initiate Validating Settings for all Plugins */
  validateSettings: () => FormValidatorResults<PluginSettings>;
  /** Accessor Function to retrieve the Settings masked. */
  getMaskedSettings: () => PluginSettings;
  /**
   * Accessor Function for Templates
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  getTemplates: <TemplateIDs extends string>() => TemplateMap<TemplateIDs>;
  /** Accessor Function for Settings */
  getSettings: () => PluginSettings;
  /** Action Function to Set Settings */
  setSettings: (settings: PluginSettings, forceEncode?: boolean) => void;
  /** Accessor Function for Registered Plugins */
  getPlugins: () => PluginInstances<PluginSettings>;
  /** Action Function to Reinitialize Plugins */
  pluginLoader: () => void;
  /** Accessor Function for Display Manager */
  // TODO: Change to actual Accessor Function to match other items
  // TODO: Rename away from `errorDisplay`
  errorDisplay: DisplayManager;
};

/**
 * Instance Typing of a Renderer.
 */
export type RendererInstance = {
  init(): Promise<void>;
};

/**
 * Static Typing of a Renderer Class.
 *
 * > NOTE: A Renderer should have a `constructor` that matches this signature!
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type RendererConstructor<PluginSettings extends PluginSettingsBase> = {
  new (options: RendererInstanceOptions<PluginSettings>): RendererInstance;
};
