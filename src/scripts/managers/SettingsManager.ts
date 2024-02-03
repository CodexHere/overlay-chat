import get from 'lodash.get';
import set from 'lodash.set';
import { PluginSettingsBase } from '../types/Plugin.js';
import { FormEntry, FormEntryGrouping, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class SettingsManager<OS extends PluginSettingsBase> {
  private _parsedJsonResults: ParsedJsonResults | undefined;
  private _settings: OS = {} as OS;
  private _settingsSchema: FormEntry[] = [];
  private _settingsSchemaDefault: FormEntry[] = [];

  constructor(private locationHref: string) {}

  async init() {
    this.loadSettingsFromUri();
    // Load Core Settings Schema
    this._settingsSchemaDefault = await (await fetch('../../schemaSettingsCore.json')).json();
    this.resetSettingsSchema();
  }

  getSettings = (): OS => {
    return structuredClone(this._settings);
  };

  getMaskedSettings = (): OS => {
    return this.toggleMaskSettings(this.getSettings(), true);
  };

  setSettings = (settings: OS) => {
    this._settings = settings;
    this.updateParsedJsonResults(settings);
    this.toggleMaskSettings(settings, true);
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

  updateParsedJsonResults = (settings: OS = this._settings) => {
    this._parsedJsonResults = FromJson(this.getSettingsSchema(), settings);
  };

  private loadSettingsFromUri() {
    // Load Settings from URI (injected from Window HREF)
    this._settings = URI.QueryStringToJson(this.locationHref);
  }

  private toggleMaskSettings(settings: OS, mask: boolean) {
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
