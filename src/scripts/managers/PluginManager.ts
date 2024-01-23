import { Managers, OverlayPluginConstructor, OverlayPluginInstance, RenderOptions } from '../types.js';
import EnhancedEventEmitter from '../utils/EnhancedEventEmitter.js';
import { BOOLEAN_TRUES } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export default class PluginManager {
  bus: EnhancedEventEmitter;

  plugins: OverlayPluginInstance[] = [];

  constructor(
    private managers: Managers,
    private renderOptions: RenderOptions
  ) {
    this.managers.pluginManager = this;
    this.bus = new EnhancedEventEmitter();
  }

  private getPluginPath = (pluginName: string) => {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  };

  private pluginBaseUrls() {
    let pluginUrls: string[] = [];

    const { customPlugins, plugins } = this.managers.settingsManager.settings;

    if (customPlugins) {
      pluginUrls = customPlugins.split(';');
    } else if (plugins) {
      // At runtime, `plugins` may actually be a single string due to deserializing
      // URLSearchParams that only had one specified plugin
      pluginUrls = Array.isArray(plugins) ? plugins : ([plugins] as unknown as string[]);

      pluginUrls = pluginUrls
        // Convert `true:SomePluginName` -> `SomePluginName`
        .filter(invalidPluginData => BOOLEAN_TRUES.includes(invalidPluginData.split(':')[0]))
        .map(invalidPluginData => invalidPluginData.split(':')[1])
        // Iterate getting the full plugin path
        .map(this.getPluginPath);
    }

    return pluginUrls;
  }

  async init() {
    // Load and register new plugin
    await this.loadPlugins();
  }

  async loadPlugins() {
    // Unregister existing plugins, first
    this.plugins.forEach(plugin => plugin.unregister?.());

    const pluginBaseUrls = this.pluginBaseUrls();

    await this.importModules(pluginBaseUrls);
    this.loadPluginStyles(pluginBaseUrls);

    // Sort Plugins by Priority
    this.plugins.sort((a, b) => {
      if (!a.priority) {
        return 1;
      }

      if (!b.priority) {
        return -1;
      }

      return (
        b.priority < a.priority ? -1
        : b.priority > a.priority ? 1
        : 0
      );
    });

    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    this.plugins.forEach(plugin => plugin.loadSettingsSchema?.());
  }

  private async importModules(pluginBaseUrls: string[]) {
    // TODO Need to test a single plugin breaking, how it's handled as a chain...
    const promises = pluginBaseUrls.map(async pluginUrl => await this.loadPluginInstance(pluginUrl));
    this.plugins = (await Promise.all(promises)).filter(plugin => !!plugin) as OverlayPluginInstance[];
  }

  private async loadPluginInstance(pluginBaseUrl: string) {
    try {
      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginLoad = await import(/* @vite-ignore */ `${pluginBaseUrl}/plugin.js`);
      const pluginClass: OverlayPluginConstructor = pluginLoad.default;
      const pluginInstance: OverlayPluginInstance = new pluginClass(this.managers, this.renderOptions);

      return pluginInstance;
    } catch (err) {
      throw new Error(`Could not dynamically load Plugin: ${pluginBaseUrl}`);
    }
  }

  private loadPluginStyles(pluginBaseUrls: string[]) {
    pluginBaseUrls.forEach(pluginBaseUrl => {
      const head = document.getElementsByTagName('head')[0];
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = `${pluginBaseUrl}/plugin.css`;

      head.appendChild(link);
    });
  }
}
