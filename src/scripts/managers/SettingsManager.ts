import { ContextBase, OverlaySettings, PluginImports, PluginInstances, SettingsManagerOptions } from '../types.js';
import { FormEntry, FormEntryFieldGroup, FromJson, ParsedJsonResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class SettingsManager<OS extends OverlaySettings, Context extends ContextBase> {
  parsedJsonResults: ParsedJsonResults | undefined;
  private settingsSchema: FormEntry[] = [];
  private settings: OS = {} as OS;
  private settingsSchemaDefault: FormEntry[] = [];

  get isConfigured() {
    return this.options.settingsValidator(this.settings);
  }

  constructor(private options: SettingsManagerOptions<OS>) {}

  getSettings = (): OS => {
    return structuredClone(this.settings);
  };

  setSettings = (settings: OS) => {
    this.settings = settings;
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

  loadPluginSettings(plugins: PluginInstances<Context>, imports: PluginImports<Context>) {
    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    plugins.forEach(plugin => {
      try {
        const fieldGroup = plugin.getSettingsSchema?.();
        if (fieldGroup) {
          this.settingsSchema.push(fieldGroup);
        }
      } catch (err) {
        imports.bad.push(new Error(`Could not inject Settings Schema for Plugin: ${plugin.name}`));
      }
    });

    // After we've finished modifying the SettingsSchema, we can parse and cache
    this.parsedJsonResults = FromJson(this.getSettingsSchema());

    this.toggleMaskSettings(false);
  }

  toggleMaskSettings(mask: boolean) {
    const passwordEntries = this.parsedJsonResults?.mapping?.password;

    Object.keys(passwordEntries ?? {}).forEach(settingName => {
      const val = this.settings[settingName as keyof OS] as string;

      if (val) {
        const codingDir = mask ? btoa : atob;
        this.settings[settingName as keyof OS] = codingDir(val) as OS[keyof OS];
      }
    });
  }

  addPluginSettings = (fieldGroup: FormEntryFieldGroup) => {
    fieldGroup;
  };
}
