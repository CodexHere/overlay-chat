/**
 * Manages the Application's Settings State
 *
 * @module
 */

import get from 'lodash.get';
import set from 'lodash.set';
import { PluginInstance, PluginRegistration, PluginSettingsBase } from '../types/Plugin.js';
import { FromJson } from '../utils/Forms/index.js';
import { ProcessedJsonResults, SettingsSchemaEntry, SettingsSchemaGrouping } from '../utils/Forms/types.js';
import * as URI from '../utils/URI.js';
import SettingsSchemaDefault from './schemaSettingsCore_Gamut.json';

/**
 * Manages the Application's Settings State.
 *
 * On `init`, Settings are parsed from the URI, and Unmasked (aka, decrypted values for certain types).
 *
 * This class is also part of the {@link types/Plugin.PluginRegistrar | `PluginRegistrar`},
 * providing various Registration points.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class SettingsManager<PluginSettings extends PluginSettingsBase> {
  /** Cached store of the parsed JSON results from the Settings Schema. */
  private _parsedJsonResults?: ProcessedJsonResults;
  /** The Settings values, as the System currently sees them. */
  private _settings: PluginSettings = {} as PluginSettings;
  /** The Settings Schema, as the System currently sees them. */
  private _settingsSchema: SettingsSchemaEntry[] = [];
  /** The Default Settings Schema, when the System inits/resets. */
  private _settingsSchemaDefault: SettingsSchemaEntry[] = [];

  /**
   * Create a new {@link SettingsManager | `SettingsManager`}.
   *
   * @param locationHref - HREF URL containing possible URI Query Search Params as Settings.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private locationHref: string) {}

  /**
   * Initialize the Settings Manager.
   *
   * This will deserialize Settings from the Location HREF.
   *
   * > The settings will be unmasked once deserialized.
   */
  async init() {
    const settings = URI.QueryStringToJson<PluginSettings>(this.locationHref);
    this._settings = this.toggleMaskSettings(settings, false);

    // Load Core Settings Schema
    this._settingsSchemaDefault = structuredClone(SettingsSchemaDefault as SettingsSchemaEntry[]);
    this.resetSettingsSchema();
  }

  /**
   * Accessor Function for Settings.
   */
  getSettings = (): PluginSettings => {
    return structuredClone(this._settings);
  };

  /**
   * Accessor Function to retrieve the Settings masked.
   */
  getMaskedSettings = (): PluginSettings => {
    return this.toggleMaskSettings(this.getSettings(), true);
  };

  /**
   * Action Function to Set Settings.
   *
   * @param settings - Settings to store for the System.
   * @param forceEncode - Whether or not to force encoding appropriate values.
   */
  setSettings = (settings: PluginSettings, forceEncode: boolean = false) => {
    if (forceEncode) {
      this._settings = this.toggleMaskSettings(settings, true);
    } else {
      this._settings = settings;
    }

    this.updateParsedJsonResults();
  };

  /**
   * Accessor Function to get the Parsed JSON Results of processing a {@link SettingsSchemaEntry | `FormEntry[]`}. */
  getParsedJsonResults = (): ProcessedJsonResults | undefined => {
    return this._parsedJsonResults;
  };

  /**
   * Reset the Settings Schema to the default value.
   *
   * Generally this is only used when resetting the {@link managers/PluginManager | `PluginManager`}.
   */
  resetSettingsSchema() {
    this._settingsSchema = structuredClone(this._settingsSchemaDefault);
  }

  /**
   * Register a Settings Schema with the system.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param registration - The Plugin Instance's Registration Options.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  registerSettings = async (plugin: PluginInstance<PluginSettings>, registration?: PluginRegistration) => {
    if (!registration || !registration.settings) {
      return;
    }

    // Load the Settings Schema file as JSON
    const grouping: SettingsSchemaGrouping = await (await fetch(registration.settings.href)).json();
    // Enforce a `name` for the Plugin Settings as a named GroupSubSchema. This is for sanity sake later.
    grouping.name = plugin.name.toLocaleLowerCase().replaceAll(' ', '_');
    // Ensure incoming Grouping is a subschema definition.
    grouping.inputType = 'group-subschema';
    grouping.values = grouping.values ?? [];

    // Push a final GroupSubSchema into the values with Plugin Metadata
    grouping.values.push({
      inputType: 'group-subschema',
      label: 'Plugin Metadata',
      name: `pluginMetadata-${plugin.name}`,
      values: this.getPluginMetaInputs(plugin, registration)
    });

    this._settingsSchema.push(grouping);
  };

  /**
   * Generate the Plugin Metadata {@link SettingsSchemaEntry | `FormEntry`} Settings Schema.
   *
   * > NOTE: This is mostly for displaying in Settings configurator.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param registration - Registration object to garner metadata against
   */
  private getPluginMetaInputs(
    plugin: PluginInstance<PluginSettings>,
    registration: PluginRegistration
  ): SettingsSchemaEntry[] {
    return [
      {
        inputType: 'text',
        name: ' ',
        label: 'Name',
        defaultValue: plugin.name
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Version',
        defaultValue: plugin.version
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Priority',
        defaultValue: plugin.priority || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Middleware Chain(s)',
        defaultValue: registration.middlewares && Object.keys(registration.middlewares).join(', ')
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Listening',
        defaultValue: registration.events?.recieves && Object.keys(registration.events?.recieves).join(', ')
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Sent',
        defaultValue: registration.events?.sends && registration.events?.sends.join(', ')
      }
    ];
  }

  /**
   * Update the cached Parsed JSON Results from parsing the Settings Schema.
   *
   * @param pluginsLoaded - Whether this was called after the Plugins were Loaded,
   * versus initial startup.
   */
  updateParsedJsonResults = (pluginsLoaded: boolean = false) => {
    this._parsedJsonResults = FromJson(structuredClone(this._settingsSchema), this._settings);

    // Plugins just loaded, which means they injected new settings.
    // We want to now use a fully parsedJsonResult to unmask our settings completely.
    if (pluginsLoaded) {
      this.toggleMaskSettings(this._settings, false);
    }
  };

  /**
   * Toggle masking particular Settings types by encoding their values.
   *
   * @param settings - Settings to mask or unmask.
   * @param mask - Whether to mask or unmask.
   */
  private toggleMaskSettings(settings: PluginSettings, mask: boolean) {
    const maskableEntries = {
      ...this._parsedJsonResults?.mapping?.password,
      ...this._parsedJsonResults?.mapping?.hidden
    };

    Object.keys(maskableEntries ?? {}).forEach(settingName => {
      const val = get(settings, settingName);

      if (val) {
        const codingDir = mask ? btoa : atob;
        set(settings, settingName, codingDir(val));
      }
    });

    return settings;
  }
}
