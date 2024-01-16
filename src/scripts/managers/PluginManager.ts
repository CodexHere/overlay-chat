import { BootOptions, OverlayPlugin, OverlayPluginConstructor } from '../types';
import { URI } from '../utils/URI';
import SettingsManager from './SettingsManager';

export class PluginManager {
  // TODO: Needs to be an array of Plugins
  plugins: OverlayPlugin[] = [];

  constructor(private bootOptions: BootOptions, private settingsMgr: SettingsManager) {}

  private getPluginPath(pluginName: string) {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  }

  private getPluginUrl(pluginName: string) {
    return `${this.getPluginPath(pluginName)}/plugin.js`;
  }

  private getStyleUrl(pluginName: string) {
    return `${this.getPluginPath(pluginName)}/plugin.css`;
  }

  async init() {
    if (!this.settingsMgr.settings.plugins && !this.settingsMgr.settings.customPlugins) {
      // Fallback to the Default plugin
      this.settingsMgr.settings.plugins = ['Default'];
    }

    await this.loadPlugins();
  }

  async loadPlugins() {
    const hasPlugins = !!(!!this.settingsMgr.settings.plugins || this.settingsMgr.settings.customPlugins);

    if (false === hasPlugins) {
      return;
    }

    await this.importModules();
    this.loadPluginStyles();

    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    this.plugins?.forEach(plugin => plugin.loadSettingsSchema());
  }

  private async importModules() {
    const chosenPlugins = this.settingsMgr.settings.customPlugins
      ? this.settingsMgr.settings.customPlugins?.split(';')
      : this.settingsMgr.settings.plugins;

    const promises = chosenPlugins!.map(async pluginName => await this.loadPluginInstance(pluginName));

    this.plugins = (await Promise.all(promises)).filter(plugin => !!plugin) as OverlayPlugin[];
  }

  private async loadPluginInstance(pluginName: string) {
    const pluginUrl = this.getPluginUrl(pluginName);

    try {
      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginClass: OverlayPluginConstructor = (await import(/* @vite-ignore */ pluginUrl)).default;
      const plugin: OverlayPlugin = new pluginClass(this.bootOptions, this.settingsMgr);

      return plugin;
    } catch (err) {
      console.error(
        `Could not dynamically load Plugin: ${
          this.settingsMgr.settings.plugins || this.settingsMgr.settings.customPlugins
        }`
      );
    }
  }

  private loadPluginStyles() {
    this.settingsMgr.settings.plugins?.forEach(pluginName => {
      const head = document.getElementsByTagName('head')[0];
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = this.getStyleUrl(pluginName);

      head.appendChild(link);
    });
  }
}
