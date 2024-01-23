import { OverlaySettings, SettingsManagerOptions } from '../types.js';
import { FormEntry, FormEntryFieldGroup } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class SettingsManager<OS extends OverlaySettings> {
  settings: OS = {} as OS;
  private _settingsSchema: FormEntry[] = [];
  private settingsSchemaDefault: FormEntry[] = [];

  get settingsSchema(): Readonly<FormEntry[]> {
    return structuredClone(this._settingsSchema);
  }

  get isConfigured() {
    return this.options.settingsValidator(this.settings);
  }

  constructor(private options: SettingsManagerOptions<OS>) {}

  async init() {
    // Load Settings from URI (injected from Window HREF)
    this.settings = URI.QueryStringToJson(this.options.locationHref);
    // Load Core Settings Schema
    this.settingsSchemaDefault = await (await fetch('../../schemaSettingsCore.json')).json();
    this.resetSettingsSchema();
  }

  resetSettingsSchema() {
    this._settingsSchema = structuredClone(this.settingsSchemaDefault);
  }

  addPluginSettings = (fieldGroup: FormEntryFieldGroup) => {
    this._settingsSchema.push(fieldGroup);
  };
}
