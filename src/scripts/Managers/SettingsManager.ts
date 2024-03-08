/**
 * Manages the Application's Settings State
 *
 * @module
 */

import { EventEmitter } from 'events';
import get from 'lodash.get';
import set from 'lodash.set';
import { SettingsContextProvider } from '../ContextProviders/SettingsContextProvider.js';
import { ApplicationIsLockedError } from '../ContextProviders/index.js';
import { SettingsManagerEmitter } from '../types/Events.js';
import { LockHolder, SettingsMode } from '../types/Managers.js';
import { PluginInstance, PluginSettingsBase } from '../types/Plugin.js';
import { FormSchema, FormSchemaEntry, FormSchemaGrouping } from '../utils/Forms/types.js';
import { QueryStringToJson } from '../utils/URI.js';
import { IsValidValue, ToId } from '../utils/misc.js';

/**
 * Manages the Application's Settings State.
 *
 * On `init`, Settings are parsed from the URI, and Unmasked (aka, decrypted values for certain types).
 */
export class SettingsManager extends EventEmitter implements SettingsManagerEmitter {
  /** Context Provider for this Manager. */
  context?: SettingsContextProvider;

  /** The Settings values, as the Application currently sees them. */
  private _settings: PluginSettingsBase = {} as PluginSettingsBase;

  /**
   * Create a new {@link SettingsManager | `SettingsManager`}.
   *
   * @param lockHolder - Instance of {@link LockHolder | `LockHolder`} to evaluate Lock Status.
   * @param locationHref - HREF URL containing possible URI Query Search Params as Settings.
   */
  constructor(
    private lockHolder: LockHolder,
    private locationHref: string
  ) {
    super();
  }

  /**
   * Initialize the Settings Manager.
   *
   * This will deserialize Settings from the Location HREF.
   *
   * > The settings will be unmasked once deserialized.
   */
  async init() {
    this.context = new SettingsContextProvider(this.lockHolder, this);
    const settings = QueryStringToJson(this.locationHref);

    this._settings = settings;

    // TODO: Get rid of this
    // this.set(settings, false);
  }

  /**
   * Accessor Function for Settings.
   *
   * Can also return Settings as Masked values if desired.
   *
   * @param mode - Settings Mode to get data as, defaulted to `raw`. Encryption/decryption can be enforced by changing this value.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  get = <PluginSettings extends PluginSettingsBase>(mode: SettingsMode = 'raw'): PluginSettings => {
    const settings = structuredClone(this._settings);

    if ('raw' !== mode) {
      return this.toggleSettingsEncryption(settings, 'encrypted' === mode) as PluginSettings;
    }

    return settings as PluginSettings;
  };

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
    if (this.lockHolder.isLocked && 'configure' !== this.lockHolder.renderMode) {
      throw new ApplicationIsLockedError();
    }

    // Single Setting Name targeted with a value, we'll take it as a simple set.
    if (typeof setting === 'string') {
      const encryptedTypes = ['hidden', 'password'];
      const processed = this.context?.getProcessedSchema();
      const schemaEntry = processed?.mappings.byName[setting];
      this._settings[setting as keyof PluginSettingsBase] = value as any;
      if (schemaEntry && encryptedTypes.includes(schemaEntry.inputType)) {
        this.toggleSettingEncrypted(this._settings, setting, true);
      }
    } else {
      // Entire object sent in, wholesale set!
      if (IsValidValue(value)) {
        this.toggleSettingsEncryption(setting as any, value as boolean);
      }

      this._settings = setting as any;
    }
  }

  /**
   * Merge an object of Setting values into current Settings.
   *
   * Iteratively calls {@link #set | `set`}.
   *
   * @param settings - Settings object to merge.
   */
  merge<PluginSettings extends PluginSettingsBase>(settings: PluginSettings): void {
    if (this.lockHolder.isLocked && 'configure' !== this.lockHolder.renderMode) {
      throw new ApplicationIsLockedError();
    }

    Object.entries(settings as PluginSettingsBase).forEach(([settingName, settingValue]) => {
      this.set(settingName, settingValue);
    });
  }

  /**
   * Remove a Setting by name.
   *
   * @param settingName - Setting name to remove.
   */
  removeSetting(settingName: string) {
    if (this.lockHolder.isLocked) {
      throw new ApplicationIsLockedError();
    }

    delete this._settings[settingName as keyof PluginSettingsBase];

    // TODO: Do we mark stale/dirty/etc?
  }

  /**
   * Load Schema Data as a {@link FormSchemaGrouping | `FormSchemaGrouping`}.
   *
   * This will also enforce a sane `name`, `inputType`,
   * and `subSchema` with Plugin Metadata.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param schemaUrl - URL of the Schema JSON file.
   */
  loadSchemaData = async (plugin: PluginInstance, schemaUrl: string) => {
    if (this.lockHolder.isLocked) {
      throw new ApplicationIsLockedError();
    }

    // Load the Settings Schema file as JSON
    const grouping: FormSchemaGrouping = await (await fetch(schemaUrl)).json();
    // Enforce a `name` for the Plugin Settings as a named `FormSchemaGrouping`. This is for sanity sake later.
    grouping.name = ToId(plugin.name);
    // Ensure incoming Grouping is a `group-subschema` definition.
    grouping.inputType = 'group-subschema';
    grouping.subSchema = grouping.subSchema ?? [];

    // Push a final `FormSchemaGrouping` into the values with Plugin Metadata
    grouping.subSchema.push({
      inputType: 'group-subschema',
      label: 'Plugin Metadata',
      name: `pluginMetadata-${plugin.name}`,
      subSchema: this.getPluginMetaInputs(plugin)
    });

    return grouping;
  };

  /**
   * Generate the Plugin Metadata {@link FormSchemaEntry | `FormSchemaEntry`} Settings Schema.
   *
   * > NOTE: This is for displaying in Settings configurator.
   *
   * @param plugin - Instance of the Plugin to register against.
   */
  getPluginMetaInputs(plugin: PluginInstance): FormSchema {
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
        label: 'Author',
        defaultValue: plugin.author || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Homepage',
        defaultValue: plugin.homepage || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Middleware Chain(s)',
        defaultValue: 'COMING SOON'

        // ! FIXME : This needs to be got gotten
        // defaultValue: (registration.middlewares && Object.keys(registration.middlewares).join(', ')) || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Listening',
        defaultValue: 'COMING SOON'

        // ! FIXME : This needs to be got gotten
        // defaultValue: (registration.events?.recieves && Object.keys(registration.events?.recieves).join(', ')) || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Sent',
        defaultValue: 'COMING SOON'

        // ! FIXME : This needs to be got gotten
        // defaultValue: registration.events?.sends && registration.events?.sends.join(', ')
      }
    ];
  }

  /**
   * Toggle encrypting particular Settings types by encoding their values.
   *
   * @param settings - Settings to encrypt or decrypt.
   * @param encrypt - Whether to encrypt or decrypt.
   */
  private toggleSettingsEncryption<PluginSettings extends PluginSettingsBase>(
    settings: PluginSettings,
    encrypt: boolean
  ) {
    const processed = this.context?.getProcessedSchema();

    if (!processed) {
      return settings;
    }

    const { password, hidden } = processed.mappings.byType;
    const maskableEntries = {
      ...password,
      ...hidden
    };

    Object.keys(maskableEntries ?? {}).forEach(settingName => {
      this.toggleSettingEncrypted(settings, settingName, encrypt);
    });

    return settings;
  }

  /**
   * Toggle a Setting by Name to be Encrypted or Decrypted.
   *
   * @param settings - Settings object to act on.
   * @param settingName - Settings Name to act on.
   * @param encrypt - Whether to Encrypt or Decrypt to value.
   */
  private toggleSettingEncrypted<PluginSettings extends PluginSettingsBase>(
    settings: PluginSettings,
    settingName: string,
    encrypt: boolean
  ) {
    const val = get(settings, settingName);
    if (!val) {
      return;
    }

    const codingDir = encrypt ? btoa : atob;
    set(settings, settingName, codingDir(val));
  }
}