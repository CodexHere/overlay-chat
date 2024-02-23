/**
 * Manages the Application's Settings State
 *
 * @module
 */

import get from 'lodash.get';
import set from 'lodash.set';
import { PluginInstance, PluginRegistrationOptions, PluginSettingsBase } from '../types/Plugin.js';
import { FormEntry, FormEntryGrouping, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';
import SettingsSchemaDefault from './schemaSettingsCore.json';

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
  private _parsedJsonResults?: ParsedJsonResults;
  /** The Settings values, as the System currently sees them. */
  private _settings: PluginSettings = {} as PluginSettings;
  /** The Settings Schema, as the System currently sees them. */
  private _settingsSchema: FormEntry[] = [];
  /** The Default Settings Schema, when the System inits/resets. */
  private _settingsSchemaDefault: FormEntry[] = [];

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
    this._settingsSchemaDefault = structuredClone(SettingsSchemaDefault as FormEntry[]);
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
   * Accessor Function to get the Parsed JSON Results of processing a {@link FormEntry | `FormEntry[]`}. */
  getParsedJsonResults = (): ParsedJsonResults | undefined => {
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
  registerSettings = async (
    plugin: PluginInstance<PluginSettings>,
    registration?: PluginRegistrationOptions
  ) => {
    if (!registration || !registration.settings) {
      return;
    }

    // Load the Settings Schema file as JSON
    const fieldGroup: FormEntryGrouping = await (await fetch(registration.settings.href)).json();
    // Enforce a `name` for the Plugin Settings as a named FieldGroup. This is for sanity sake later.
    fieldGroup.name = plugin.name.toLocaleLowerCase().replaceAll(' ', '_');
    fieldGroup.values = fieldGroup.values ?? [];

    // Push a final FieldGroup into the values with Plugin Metadata
    fieldGroup.values.push({
      inputType: 'fieldgroup',
      label: 'Plugin Metadata',
      name: `pluginMetadata-${plugin.name}`,
      values: this.getPluginMetaInputs(plugin, registration)
    });

    this._settingsSchema.push(fieldGroup);
  };

  /**
   * Generate the Plugin Metadata {@link FormEntry | `FormEntry`} Settings Schema.
   *
   * > NOTE: This is mostly for displaying in Settings configurator.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param registration - Registration object to garner metadata against
   */
  private getPluginMetaInputs(
    plugin: PluginInstance<PluginSettings>,
    registration: PluginRegistrationOptions
  ): FormEntry[] {
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

    // Plugins just loaded, and we want to now use a fully parsedJsonResult
    // too unmask our settings correctly and completely
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
