/**
 * Types for Renderers
 *
 * @module
 */

import { EventEmitter } from 'events';
import { FormValidatorResults, ProcessedJsonResults } from '../utils/Forms/types.js';
import { TemplateMap } from '../utils/Templating.js';
import { DisplayAccessor } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

/**
 * Events that the {@link SettingsManager | `SettingsManager`} Emits.
 */
export enum RendererInstanceEvents {
  /** Fired when Plugin List has been modified */
  PLUGINS_STALE = 'rendererinstance::plugins-stale'
}

/**
 * Options for initializing the {@link RendererInstance | `RendererInstance`}.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export type RendererInstanceOptions<PluginSettings extends PluginSettingsBase> = {
  /** Accessor Function to get the Parsed JSON Results of processing a {@link FormEntry | `FormEntry[]`}. */
  getParsedJsonResults?: () => ProcessedJsonResults | undefined;
  /** Action Function to initiate Validating Settings for all Plugins. */
  validateSettings: () => FormValidatorResults<PluginSettings>;
  /** Accessor Function to retrieve the Settings masked. */
  getMaskedSettings: () => PluginSettings;
  /**
   * Accessor Function for Templates
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  getTemplates: <TemplateIDs extends string>() => TemplateMap<TemplateIDs>;
  /** Accessor Function for Settings. */
  getSettings: () => PluginSettings;
  /**
   * Action Function to Set Settings.
   *
   * @param settings - Settings to store for the System.
   * @param forceEncode - Whether or not to force encoding appropriate values.
   */
  setSettings: (settings: PluginSettings, forceEncode?: boolean) => void;
  /** Accessor Function for Registered Plugins. */
  getPlugins: () => PluginInstances<PluginSettings>;
  /** Accessor for Display Manager. */
  display: DisplayAccessor;
};

/**
 * Instance Typing of a Renderer.
 */
export type RendererInstance = EventEmitter & {
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
