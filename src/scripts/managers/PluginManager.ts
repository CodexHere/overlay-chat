import { BootOptions, OverlayPlugin, OverlayPluginConstructor } from '../types';
import { URI } from '../utils/URI';
import SettingsManager from './SettingsManager';

export class PluginManager {
  // TODO: Needs to be an array of Plugins
  plugins?: OverlayPlugin;

  constructor(private bootOptions: BootOptions, private settingsMgr: SettingsManager) {}

  private get pluginPath() {
    const baseUrl = URI.BaseUrl();
    return this.settingsMgr.settings.customPlugins
      ? this.settingsMgr.settings.customPlugins
      : `${baseUrl}/plugins/${this.settingsMgr.settings.plugins}`;
  }

  get pluginUrl() {
    return `${this.pluginPath}/plugin.js`;
  }

  get styleUrl() {
    return `${this.pluginPath}/plugin.css`;
  }

  async init() {
    if (!this.settingsMgr.settings.plugins && !this.settingsMgr.settings.customPlugins) {
      // Fallback to the Default plugin
      this.settingsMgr.settings.plugins = 'Default';
    }

    await this.loadPlugins();
  }

  async loadPlugins() {
    this.plugins = await this.loadPluginInstance(this.pluginUrl);
    this.loadPluginStyle();
  }

  private async loadPluginInstance(pluginUrl: string) {
    try {
      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginClass: OverlayPluginConstructor = (await import(/* @vite-ignore */ pluginUrl)).default;
      const plugin: OverlayPlugin = new pluginClass(this.bootOptions, this.settingsMgr);
      return plugin;
    } catch (err) {
      console.error(
        `Could not dynamically load theme file: ${
          this.settingsMgr.settings.plugins || this.settingsMgr.settings.customPlugins
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
