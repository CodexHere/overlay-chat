/**
 * Manages the Application's Settings State
 *
 * @module
 */

import get from 'lodash.get';
import set from 'lodash.set';
import { SettingsContextProvider } from '../ContextProviders/SettingsContextProvider.js';
import { PluginInstance, PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { FormSchema, FormSchemaEntry, FormSchemaGrouping, ProcessedFormSchema } from '../utils/Forms/types.js';
import { QueryStringToJson } from '../utils/URI.js';
import { ToId } from '../utils/misc.js';

/**
 * Manages the Application's Settings State.
 *
 * On `init`, Settings are parsed from the URI, and Unmasked (aka, decrypted values for certain types).
 */
export class SettingsManager {
  /** The Settings values, as the Application currently sees them. */
  private _settings: PluginSettingsBase = {} as PluginSettingsBase;

  /** Context Provider for this Manager. */
  context?: SettingsContextProvider;

  /**
   * Create a new {@link SettingsManager | `SettingsManager`}.
   *
   * @param locationHref - HREF URL containing possible URI Query Search Params as Settings.
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
    this.context = new SettingsContextProvider(this);
    const settings = QueryStringToJson(this.locationHref);
    this._settings = settings;
    this.toggleSettingsEncryption(this._settings, false);
  }

  /**
   * Accessor Function for Settings.
   *
   * Can also return Settings as Masked values if desired.
   *
   * @param masked - Whether or not to mask the settings on return
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  get = <PluginSettings extends PluginSettingsBase>(
    mode: 'raw' | 'encrypted' | 'decrypted' = 'raw'
  ): PluginSettings => {
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
  set<PluginSettings extends PluginSettingsBase>(data: PluginSettings, encrypt?: boolean): void;
  /**
   * Set a value for a specific Settings Name.
   *
   * Will Auto Encrypt depending on `inputType` of associative {@link utils/Forms/types.FormSchemaEntryBase | `FormSchemaEntryBase`}.
   *
   * @param data - Data to set as Settings.
   * @param encrypt - Whether to encrypt on storing Settings.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  set<PluginSettings extends PluginSettingsBase>(settingName: keyof PluginSettings, value: any): void;
  set(setting: unknown, value: unknown): void {
    // Single Setting Name targeted with a value, we'll take it as a simple set.
    if (typeof setting === 'string') {
      // ! FIXME : Need to encrypt based on type
      this._settings[setting as keyof PluginSettingsBase] = value as any;
    } else {
      // Entire object sent in, wholesale set!
      if (value) {
        this.toggleSettingsEncryption(value, true);
      }

      this._settings = setting as any;
    }
  }

  /**
   * Merge an object of Setting values into current Settings.
   *
   * Iteratively calls {@link #set | `set`}.
   *
   * @param data - Settings object to merge.
   */
  merge<PluginSettings extends PluginSettingsBase>(settings: PluginSettings): void {
    Object.entries(settings as PluginSettingsBase).forEach(([settingName, settingValue]) => {
      this.set(settingName, settingValue);
    });
  }

  /**
   * Remove a Setting by name.
   *
   * @param settingName - Setting name to remove.
   */
  remove(settingName: string) {
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
   * > NOTE: This is mostly for displaying in Settings configurator.
   *
   * @param plugin - Instance of the Plugin to register against.
   * @param registration - Registration object to garner metadata against
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
   * ! FIXME : I don't like this process...
   * ! It's not really updating the processed schema anymore, and it only really did it after plugins were
   * ! loaded/updated... now that that is adhoc (again), it's just re-unmasking settings - but why??? what is the use-case? Can we clean up the lifecycle around it????? PLEASSEEEE??E?E?E?E
   * ! ------- TEST ------ Change password settings in a list, then load a new plugin and see if the passwords still work right.
   *
   * Update the aggregated cached {@link ProcessedFormSchema | `ProcessedFormSchema`} from parsing the Settings Schema.
   *
   * This is generally called after ALL Plugins load during Bootstrapping, or
   *
   * @param plugins - If supplied, represents which Plugins were loaded.
   */
  updateProcessedSchema = (plugins?: PluginInstances) => {
    // Plugins just loaded, which means they injected new settings.
    // We want to now use a fully parsedJsonResult to unmask our settings completely.
    if (plugins) {
      // this.toggleMaskSettings(this._settings, false);
    }
  };

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
      const val = get(settings, settingName);

      if (val) {
        const codingDir = encrypt ? btoa : atob;
        set(settings, settingName, codingDir(val));
      }
    });

    return settings;
  }
}
