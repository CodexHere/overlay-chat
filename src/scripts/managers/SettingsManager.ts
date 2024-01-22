import { OverlaySettings } from '../types.js';
import { FormEntry, FormEntryFieldGroup } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export default class SettingsManager {
  settings: OverlaySettings = {};
  private _settingsSchema: FormEntry[] = [];
  private settingsSchemaDefault: FormEntry[] = [];

  get settingsSchema(): Readonly<FormEntry[]> {
    return structuredClone(this._settingsSchema);
  }

  get isConfigured() {
    return !!this.settings.channelName;
  }

  constructor(private locationHref: string) {}

  async init() {
    // Load Settings from URI (injected from Window HREF)
    this.settings = URI.QueryStringToJson(this.locationHref);
    // Load Core Settings Schema
    this.settingsSchemaDefault = await (await fetch('../../schemaSettingsCore.json')).json();
    this.resetSettingsSchema();
  }

  resetSettingsSchema() {
    this._settingsSchema = structuredClone(this.settingsSchemaDefault);
  }

  addPluginSettings(fieldGroup: FormEntryFieldGroup) {
    this._settingsSchema.push(fieldGroup);
  }
}
