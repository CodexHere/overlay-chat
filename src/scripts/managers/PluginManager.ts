import { BootOptions, OverlayPlugin, OverlayPluginConstructor } from '../types';
import { FormEntry } from '../utils/Forms';
import { URI } from '../utils/URI';
import SettingsManager from './SettingsManager';

export class PluginManager {
  plugin?: OverlayPlugin;
  settingsSchema: FormEntry[] = [];

  constructor(private bootOptions: BootOptions, private settingsMgr: SettingsManager) {}

  private get pluginPath() {
    const baseUrl = URI.BaseUrl();
    return this.settingsMgr.settings.customTheme
      ? this.settingsMgr.settings.customTheme
      : `${baseUrl}/plugins/${this.settingsMgr.settings.theme}`;
  }

  get pluginUrl() {
    return `${this.pluginPath}/plugin.js`;
  }

  get styleUrl() {
    return `${this.pluginPath}/plugin.css`;
  }

  async init() {
    // TODO: This should actually be extracted... Would like to move to settings manager, but might have to be bootstrapper... Test and evaluate!
    // Load Core Settings Schema
    this.settingsSchema = await (await fetch('../../schemaSettingsCore.json')).json();

    if (!this.settingsMgr.settings.theme && !this.settingsMgr.settings.customTheme) {
      return;
    }

    this.plugin = await this.loadPluginInstance();
    this.loadPluginStyle();
  }

  private async loadPluginInstance() {
    try {
      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginClass: OverlayPluginConstructor = (await import(this.pluginUrl)).default;
      const plugin: OverlayPlugin = new pluginClass(this.bootOptions, this.settingsMgr, this.settingsSchema);
      return plugin;
    } catch (err) {
      console.error(
        `Could not dynamically load theme file: ${
          this.settingsMgr.settings.theme || this.settingsMgr.settings.customTheme
        }`
      );
    }
  }

  private loadPluginStyle() {
    const head = document.getElementsByTagName('head')[0];
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = this.styleUrl;

    head.appendChild(link);
  }
}
