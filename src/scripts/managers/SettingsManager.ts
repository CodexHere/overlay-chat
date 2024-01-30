import get from 'lodash.get';
import set from 'lodash.set';
import { OverlaySettings, PluginImports, PluginInstances, SettingsManagerOptions } from '../types.js';
import { FormEntry, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class SettingsManager<OS extends OverlaySettings> {
  parsedJsonResults: ParsedJsonResults | undefined;
  private settingsSchema: FormEntry[] = [];
  private settings: OS = {} as OS;
  private settingsSchemaDefault: FormEntry[] = [];

  get isConfigured() {
    return this.options.settingsValidator(this.settings);
  }

  constructor(private options: SettingsManagerOptions<OS>) {}

  getSettings = (unmask: boolean = true): OS => {
    const settings = structuredClone(this.settings);

    return unmask ? this.toggleMaskSettings(settings, false) : settings;
  };

  setSettings = (settings: OS) => {
    this.settings = settings;

    this.updateParsedJsonResults(settings);

    this.toggleMaskSettings(settings, true);
  };

  getSettingsSchema(): Readonly<FormEntry[]> {
    return structuredClone(this.settingsSchema);
  }

  async init() {
    this.loadSettingsFromUri();
    // Load Core Settings Schema
    this.settingsSchemaDefault = await (await fetch('../../schemaSettingsCore.json')).json();
    this.resetSettingsSchema();
  }

  loadSettingsFromUri() {
    // Load Settings from URI (injected from Window HREF)
    this.settings = URI.QueryStringToJson(this.options.locationHref);
  }

  resetSettingsSchema() {
    this.settingsSchema = structuredClone(this.settingsSchemaDefault);
  }

  registerPluginSettings(plugins: PluginInstances<OS>, imports: PluginImports<OS>) {
    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    plugins.forEach(plugin => {
      try {
        const fieldGroup = plugin.registerPluginSettings?.();
        if (fieldGroup) {
          this.settingsSchema.push(fieldGroup);
        }
      } catch (err) {
        imports.bad.push(new Error(`Could not inject Settings Schema for Plugin: ${plugin.name}`));
      }
    });

    // After we've finished modifying the SettingsSchema, we can parse and cache
    this.updateParsedJsonResults();
  }

  updateParsedJsonResults(settings: OS = this.settings) {
    this.parsedJsonResults = FromJson(this.getSettingsSchema(), settings);
  }

  toggleMaskSettings(settings: OS, mask: boolean) {
    const passwordEntries = this.parsedJsonResults?.mapping?.password;

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
