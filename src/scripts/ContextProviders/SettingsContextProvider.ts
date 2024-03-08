/**
 * Context Provider for Settings
 *
 * @module
 */

import { ContextProvider_Settings } from '../types/ContextProviders.js';
import { CoreEvents, SettingsManagerEmitter } from '../types/Events.js';
import { LockHolder } from '../types/Managers.js';
import { PluginInstance, PluginSettingsBase } from '../types/Plugin.js';
import { BuildFormSchema } from '../utils/Forms/Builder.js';
import { GroupSubSchema } from '../utils/Forms/SchemaProcessors/Grouping/GroupSubSchema.js';
import {
  FormSchemaEntry,
  FormSchemaGrouping,
  NameFormSchemaEntryOverrideMap,
  ProcessedFormSchema
} from '../utils/Forms/types.js';
import { ToId } from '../utils/misc.js';
import { ApplicationIsLockedError } from './index.js';
import SettingsSubSchemaDefault from './schemaSettingsCore.json';

/**
 * Context Provider for Settings.
 *
 * Manages the Plugin Schema Cache, as well as registers built-in Settings Schema.
 */
export class SettingsContextProvider implements ContextProvider_Settings {
  /**
   * Get the Settings for the Application.
   *
   * @param mode - Determines whether to return the Settings as stored (raw), encrypted, or decrypted.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  get: <PluginSettings extends PluginSettingsBase>(mode?: 'raw' | 'encrypted' | 'decrypted') => PluginSettings;

  /** Reference Symbol representing a Plugin for the default `FormSchemaGrouping`. */
  #ref = Symbol('built-in');

  /** Mapped cached store of the original Settings Schema per Plugin. */
  #pluginSchemaCacheMap: Map<Symbol, FormSchemaGrouping> = new Map();

  /** Cached results from a requested {@link FormSchemaEntry | `FormSchemaEntry`} aggregate. */
  #processedSchemaCache?: ProcessedFormSchema;

  /** A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time. */
  #schemaOverrides: NameFormSchemaEntryOverrideMap = {};

  /** Instance of {@link LockHolder | `LockHolder`} to evaluate Lock Status. */
  #lockHolder: LockHolder;

  /** {@link SettingsManagerEmitter | `SettingsManagerEmitter`} instance for the {@link types/ContextProviders.ContextProvider_Settings | `ContextProvider_Settings`} to act on. */
  #manager: SettingsManagerEmitter;

  /**
   * Creates new {@link SettingsContextProvider | `SettingsContextProvider`}.
   *
   * @param lockHolder - Instance of {@link LockHolder | `LockHolder`} to evaluate Lock Status.
   * @param manager - {@link SettingsManagerEmitter | `SettingsManagerEmitter`} instance for the {@link types/ContextProviders.ContextProvider_Settings | `ContextProvider_Settings`} to act on.
   */
  constructor(lockHolder: LockHolder, manager: SettingsManagerEmitter) {
    this.#lockHolder = lockHolder;
    this.#manager = manager;

    // Proxy properties to the Manager
    this.get = this.#manager.get.bind(this.#manager);

    // Cache the built-in `ProcessedFormSchema`
    this.#pluginSchemaCacheMap.set(this.#ref, SettingsSubSchemaDefault as FormSchemaGrouping);
  }

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
    mode: 'raw' | 'encrypted' | 'decrypted' = 'raw'
  ): PluginSettings | null {
    const settings = this.get<PluginSettings>(mode);
    const defaultSchemaGrouping = this.#pluginSchemaCacheMap.get(this.#ref)!;
    const schemaGrouping = this.#pluginSchemaCacheMap.get(plugin.ref);

    if (!schemaGrouping) {
      return null;
    }

    // Process the Plugin's Schema to get their Keys from the returned Mappings.
    const processed = BuildFormSchema([defaultSchemaGrouping, schemaGrouping], settings, this.#schemaOverrides);
    const settingsKeys = Object.keys(processed.mappings.byName);

    // Return a subset of the Settings of just the keys for the Plugin (and built-in).
    return settingsKeys.reduce((pluginSettings, settingName) => {
      // Copy setting to reducer value if it belongs to the Plugin
      if (settingsKeys.includes(settingName)) {
        pluginSettings[settingName as keyof PluginSettings] = settings[settingName as keyof PluginSettings];
      }
      return pluginSettings;
    }, {} as PluginSettings);
  }

  /**
   * Retrieve the aggregate {@link ProcessedFormSchema | `ProcessedFormSchema`} for all Plugins.
   */
  getProcessedSchema(): ProcessedFormSchema | null {
    // If we're already cached, then return it!
    if (this.#processedSchemaCache) {
      return this.#processedSchemaCache;
    }

    // No Plugins have registered any FormSchema's
    if (0 === this.#pluginSchemaCacheMap.size) {
      return null;
    }

    // ! Assumes Plugins added `FormSchema`s in Priority-order
    const schemaList = [...this.#pluginSchemaCacheMap.values()];
    // Process and cache...
    this.#processedSchemaCache = BuildFormSchema(schemaList, this.get(), this.#schemaOverrides);

    return this.#processedSchemaCache;
  }

  /**
   * Unregister a Plugin from the Application.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void {
    if (this.#lockHolder.isLocked) {
      throw new ApplicationIsLockedError();
    }

    this.#processedSchemaCache = undefined;

    // Get the cached Schema for the Plugin
    const schemaGrouping = this.#pluginSchemaCacheMap.get(plugin.ref);

    if (!schemaGrouping) {
      return;
    }

    // Process the Plugin's Schema to get their Keys from the returned Mappings.
    const processed = new GroupSubSchema(schemaGrouping, this.get(), this.#schemaOverrides).process();
    const pluginSettingsNames = Object.keys(processed.mappings.byName);

    pluginSettingsNames.forEach(name => {
      // Have Manager `remove` from the Settings
      this.#manager.removeSetting(name);

      // Remove local overrides for Schema Entries
      delete this.#schemaOverrides[name];
    });

    // Remove Plugin Schema from cache
    this.#pluginSchemaCacheMap.delete(plugin.ref);
  }

  /**
   * Registers a {@link FormSchemaGrouping | `FormSchemaGrouping`} File for a Plugin.
   *
   * > The file should be a single {@link FormSchemaGrouping | `FormSchemaGrouping`} in a properly formatted JSON file.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param schemaUrl - URL of the `FormSchemaGrouping` to load as JSON.
   */
  async register(plugin: PluginInstance, schemaUrl: URL): Promise<void> {
    if (this.#lockHolder.isLocked) {
      throw new ApplicationIsLockedError();
    }

    const schemaGrouping: FormSchemaGrouping = await this.#manager.loadSchemaData(plugin, schemaUrl.href);

    // Force the Name/Label for the Plugin's `FormSchemaGrouping`
    // to be based on the Plugin's Name.
    schemaGrouping.name = ToId(plugin.name);
    schemaGrouping.label = plugin.name;

    // Store original Schema Data for updating process cache if ever necessary
    this.#pluginSchemaCacheMap.set(plugin.ref, schemaGrouping);
    this.#processedSchemaCache = undefined;
  }

  /**
   * Override a Settings {@link FormSchemaEntry | `FormSchemaEntry`} by Settings Name.
   *
   * This supplied  {@link FormSchemaEntry | `FormSchemaEntry`} will be merged with the
   * original entry supplied by the Plugin when Registered.
   *
   * > Note: When processing the override {@link FormSchemaEntry | `FormSchemaEntry`}'s `inputType` must match the original, or the override will fail through to the original.
   *
   * @param settingName - Name of the Setting to supply an overridden {@link FormSchemaEntry | `FormSchemaEntry`}.
   * @param newSchema - New {@link FormSchemaEntry | `FormSchemaEntry`} for the `settingName`.
   */
  overrideSettingSchema<PluginSettings extends PluginSettingsBase>(
    settingName: keyof PluginSettings,
    newSchema: Partial<FormSchemaEntry>
  ): void {
    this.#processedSchemaCache = undefined;

    newSchema.name = settingName as string;
    this.#schemaOverrides[settingName as string] = newSchema;

    this.#manager.emit(CoreEvents.SchemaChanged);
  }

  /**
   * Set the Settings wholesale as an entire object.
   *
   * @param settings - Data to set as Settings.
   * @param encrypt - Whether to encrypt on storing Settings. //! TODO: Is this necessary? Shouldn't we just treat settings as raw, ALWAYS? then we can decrypt for access?
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  set<PluginSettings extends PluginSettingsBase>(settings: PluginSettings, encrypt?: boolean): void;
  /**
   * Set a value for a specific Settings Name.
   *
   * Will Auto Encrypt depending on `inputType` of associative {@link utils/Forms/types.FormSchemaEntryBase | `FormSchemaEntryBase`}.
   *
   * @param settingName - Settings Name which to set/replace a value.
   * @param value - Value to set/replace for the Settings Name.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  set<PluginSettings extends PluginSettingsBase>(settingName: keyof PluginSettings, value: any): void;
  set(setting: unknown, value: unknown): void {
    this.#processedSchemaCache = undefined;

    this.#manager.set(setting as any, value);
  }

  /**
   * Merge an object of Setting values into current Settings.
   *
   * Iteratively calls {@link #set | `set`}.
   *
   * @param settings - Settings object to merge.
   */
  merge<PluginSettings extends PluginSettingsBase>(settings: PluginSettings): void {
    this.#processedSchemaCache = undefined;

    this.#manager.merge(settings);
  }
}
