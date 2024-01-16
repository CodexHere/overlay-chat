import { OverlaySettings } from '../types';
import { FormEntry } from '../utils/Forms';
import { URI } from '../utils/URI';

export default class SettingsManager {
  settingsSchema: FormEntry[] = [];
  settings: OverlaySettings = {};

  private settingsSchemaDefault: FormEntry[] = [];

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
    this.settingsSchema = structuredClone(this.settingsSchemaDefault);
  }
}
