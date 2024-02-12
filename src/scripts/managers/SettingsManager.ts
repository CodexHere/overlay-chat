import get from 'lodash.get';
import set from 'lodash.set';
import { PluginSettingsBase } from '../types/Plugin.js';
import { FormEntry, FormEntryGrouping, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

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
    // TODO: Should be injected into Bootstrapper! This will make librarifying COAP much easier
    // TODO: Maybe the core lib should just import this, and thus repopulate itself based on all plugin settings
    this._settingsSchemaDefault = await (await fetch('../../schemaSettingsCore.json')).json();
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

  registerSettings = (fieldGroup?: FormEntryGrouping) => {
    if (!fieldGroup) {
      return;
    }

    this._settingsSchema.push(fieldGroup);
  };

  updateParsedJsonResults = (pluginsLoaded: boolean = false) => {
    this._parsedJsonResults = FromJson(this.getSettingsSchema(), this._settings);

    // Plugins just loaded, and we want to now use a fully parsedJsonResult
    // too unmask our settings correctly and completely
    if (pluginsLoaded) {
      this.toggleMaskSettings(this._settings, false);
    }
  };

  private toggleMaskSettings(settings: PluginSettings, mask: boolean) {
    const passwordEntries = this._parsedJsonResults?.mapping?.password;

    Object.keys(passwordEntries ?? {}).forEach(settingName => {
      const val = get(settings, settingName);

      if (val) {
        const codingDir = mask ? btoa : atob;
        set(settings, settingName, codingDir(val));
      }
    });

    return settings;
  }
}
