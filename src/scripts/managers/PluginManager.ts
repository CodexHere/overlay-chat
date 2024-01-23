import {
  OverlayPluginConstructor,
  OverlayPluginInstance,
  OverlaySettings,
  PluginImports,
  PluginManagerOptions
} from '../types.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { BOOLEAN_TRUES } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class PluginManager<OS extends OverlaySettings, CS extends Object> {
  bus: EnhancedEventEmitter;
  plugins: OverlayPluginInstance<CS>[] = [];

  constructor(private options: PluginManagerOptions<OS>) {
    this.bus = new EnhancedEventEmitter();
  }

  private getPluginPath = (pluginName: string) => {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  };

  private pluginBaseUrls() {
    let pluginUrls: string[] = [];

    const { customPlugins, plugins } = this.options.settingsManager.settings;

    if (customPlugins) {
      pluginUrls = customPlugins.split(';');
    } else if (plugins) {
      // At runtime, `plugins` may actually be a single string due to deserializing
      // URLSearchParams that only had one specified plugin
      pluginUrls = Array.isArray(plugins) ? plugins : ([plugins] as unknown as string[]);

      pluginUrls = pluginUrls
        // Filter allow `true` values (format is: `boolean:Value`)
        .filter(invalidPluginData => BOOLEAN_TRUES.includes(invalidPluginData.split(':')[0]))
        // Convert `true:SomePluginName` -> `SomePluginName`
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
    // Unregister existing plugins before loading new ones
    this.plugins.forEach(plugin => plugin.unregister?.(this.options.renderOptions));

    const pluginBaseUrls = this.pluginBaseUrls();
    const imports = await this.importModules(pluginBaseUrls);

    // Sort Plugins by Priority
    this.plugins.sort(this.sortPlugins);
    // Load Style for Plugin
    this.loadPluginStyles(pluginBaseUrls);

    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    this.plugins.forEach(plugin => {
      try {
        plugin.injectSettingsSchema?.(this.options.settingsManager.addPluginSettings);
      } catch (err) {
        imports.bad.push(new Error(`Could not inject Settings Schema for Plugin: ${plugin.name}`));
      }
    });

    if (0 !== imports.bad.length) {
      throw new Error(imports.bad.join('<br /><br />'));
    }
  }

  private sortPlugins(a: OverlayPluginInstance<CS>, b: OverlayPluginInstance<CS>) {
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
  }

  private async importModules(pluginBaseUrls: string[]) {
    const promises = pluginBaseUrls.map(async pluginUrl => await this.loadPluginInstance(pluginUrl));

    const setteled = (await Promise.allSettled(promises))
      // Filter bad results
      .reduce(
        (plugins, result) => {
          if ('fulfilled' === result.status) {
            if (result.value) {
              plugins.good.push(result.value);
            }
          } else {
            plugins.bad.push(result.reason);
          }

          return plugins;
        },
        {
          good: [],
          bad: []
        } as PluginImports<CS>
      );

    this.plugins = setteled.good;

    return setteled;
  }

  private async loadPluginInstance(pluginBaseUrl: string) {
    let pluginClass: OverlayPluginConstructor<CS> | undefined;

    try {
      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginLoad = await import(/* @vite-ignore */ `${pluginBaseUrl}/plugin.js`);
      pluginClass = pluginLoad.default;

      if (!pluginClass) {
        if (pluginLoad) {
          throw new Error('Missing `default` export in Plugin Module!');
        }
      }
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(`Plugin does not exist at URL: ${pluginBaseUrl}`);
      } else if (err instanceof Error) {
        throw new Error(`Could not dynamically load Plugin:<br />${pluginBaseUrl}<br /><br />${err.message}`);
      }
    }

    try {
      const pluginInstance: OverlayPluginInstance<CS> = new pluginClass!(this.bus);
      return pluginInstance;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Plugin could not be instantiated:<br />${pluginBaseUrl}<br /><br /><pre>${err.stack}</pre>`);
      }
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
