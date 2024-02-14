import get from 'lodash.get';
import set from 'lodash.set';
import { PluginInstance, PluginRegistrationOptions, PluginSettingsBase } from '../types/Plugin.js';
import { FormEntry, FormEntryGrouping, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';
import SettingsSchemaDefault from './schemaSettingsCore.json';

export class SettingsManager<PluginSettings extends PluginSettingsBase> {
  private _parsedJsonResults: ParsedJsonResults | undefined;
  private _settings: PluginSettings = {} as PluginSettings;
  private _settingsSchema: FormEntry[] = [];
  private _settingsSchemaDefault: FormEntry[] = [];

  constructor(private locationHref: string) {}

  async init() {
    const settings = URI.QueryStringToJson<PluginSettings>(this.locationHref);
    this._settings = this.toggleMaskSettings(settings, false);

    // Load Core Settings Schema
    this._settingsSchemaDefault = structuredClone(SettingsSchemaDefault as FormEntry[]);
    this.resetSettingsSchema();
  }

  getSettings = (): PluginSettings => {
    return structuredClone(this._settings);
  };

  getUnmaskedSettings = (): PluginSettings => {
    return this.toggleMaskSettings(this.getSettings(), false);
  };

  getMaskedSettings = (): PluginSettings => {
    return this.toggleMaskSettings(this.getSettings(), true);
  };

  setSettings = (settings: PluginSettings, forceEncode: boolean = false) => {
    if (forceEncode) {
      this._settings = this.toggleMaskSettings(settings, true);
    } else {
      this._settings = settings;
    }

    this.updateParsedJsonResults();
  };

  getSettingsSchema(): Readonly<FormEntry[]> {
    return structuredClone(this._settingsSchema);
  }

  getParsedJsonResults = (): ParsedJsonResults | undefined => {
    return this._parsedJsonResults;
  };

  resetSettingsSchema() {
    this._settingsSchema = structuredClone(this._settingsSchemaDefault);
  }

  registerSettings = async (plugin: PluginInstance<PluginSettings>, registration?: PluginRegistrationOptions) => {
    if (!registration || !registration.settings) {
      return;
    }

    const fieldGroup: FormEntryGrouping = await (await fetch(registration.settings.href)).json();

    fieldGroup.name = plugin.name.toLocaleLowerCase().replaceAll(' ', '_');
    fieldGroup.values = fieldGroup.values ?? [];

    fieldGroup.values.push({
      inputType: 'fieldgroup',
      label: 'Plugin Metadata',
      name: `pluginMetadata-${plugin.name}`,
      values: this.getPluginMetaInputs(plugin, registration)
    });

    this._settingsSchema.push(fieldGroup);
  };

  getPluginMetaInputs(plugin: PluginInstance<PluginSettings>, registration: PluginRegistrationOptions): FormEntry[] {
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
        defaultValue: registration.events?.receives && Object.keys(registration.events?.receives).join(', ')
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Sent',
        defaultValue: registration.events?.sends && registration.events?.sends.join(', ')
      }
    ];
  }

  updateParsedJsonResults = (pluginsLoaded: boolean = false) => {
    this._parsedJsonResults = FromJson(this.getSettingsSchema(), this._settings);

    // Plugins just loaded, and we want to now use a fully parsedJsonResult
    // too unmask our settings correctly and completely
    if (pluginsLoaded) {
      this.toggleMaskSettings(this._settings, false);
    }
  };

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
