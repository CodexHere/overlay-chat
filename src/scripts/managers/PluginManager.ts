import { Pipe, pipeline } from '@digibear/middleware';
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

type PluginLoaders<CS extends object> = Array<string | OverlayPluginConstructor<CS>>;
type PluginInstances<CS extends object> = OverlayPluginInstance<CS>[];

export class PluginManager<OS extends OverlaySettings, CS extends object> {
  bus: EnhancedEventEmitter;
  plugins: PluginInstances<CS> = [];
  pipeline: Pipe<CS>;

  constructor(private options: PluginManagerOptions<OS, CS>) {
    this.bus = new EnhancedEventEmitter();
    this.pipeline = pipeline<CS>();
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

  unregisterPlugins() {
    const numPlugins = this.plugins.length;

    // Unregister existing plugins, and remove from list
    for (let idx = numPlugins - 1; idx >= 0; idx--) {
      const plugin = this.plugins[idx];
      plugin.unregister?.(this.options.renderOptions);
      this.plugins.splice(idx, 1);
    }
  }

  async loadPlugins() {
    // Unregister Plugins before loading any new ones
    this.unregisterPlugins();

    // Load all URLs for desired plugins
    const pluginLoaders: PluginLoaders<CS> = this.pluginBaseUrls() as PluginLoaders<CS>;
    // Prepend Default plugin to instantiate/import
    pluginLoaders.unshift(this.options.defaultPlugin);
    // Perform Imports/Intantiations
    const imports = await this.importModules(pluginLoaders);
    // Assign Plugins as the "Good" imports
    imports.good.forEach(imported => this.plugins.push(imported));

    // Sort Plugins by Priority
    this.plugins.sort(this.sortPlugins);
    // Load Settings for Plugins
    this.loadPluginSettings(imports);
    // Load Style for Plugin
    this.loadPluginStyles(pluginLoaders);

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

    const sortval =
      b.priority < a.priority ? 1
      : b.priority > a.priority ? -1
      : 0;

    return sortval;
  }

  private async importModules(pluginLoaders: PluginLoaders<CS>) {
    const promises = pluginLoaders.map(async pluginUrl => await this.loadPluginInstance(pluginUrl));

    return (
      (await Promise.allSettled(promises))
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
        )
    );
  }

  private async loadPluginInstance(pluginLoadValue: string | OverlayPluginConstructor<CS>) {
    let pluginClass: OverlayPluginConstructor<CS> | undefined;

    if (typeof pluginLoadValue === 'string') {
      pluginClass = await this.importPlugin(pluginLoadValue as string);
    } else {
      pluginClass = pluginLoadValue as OverlayPluginConstructor<CS>;
    }

    // Instantiate Plugin
    try {
      const pluginInstance: OverlayPluginInstance<CS> = new pluginClass!(this.bus);
      return pluginInstance;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Plugin could not be instantiated:<br />${pluginLoadValue}<br /><br /><pre>${err.stack}</pre>`);
      }
    }
  }

  private async importPlugin(pluginBaseUrl: string) {
    try {
      let pluginClass: OverlayPluginConstructor<CS> | undefined;

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

      return pluginClass;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(`Plugin does not exist at URL: ${pluginBaseUrl}`);
      } else if (err instanceof Error) {
        throw new Error(`Could not dynamically load Plugin:<br />${pluginBaseUrl}<br /><br />${err.message}`);
      }
    }
  }

  private loadPluginStyles(pluginLoaders: PluginLoaders<CS>) {
    for (let idx = 0; idx < pluginLoaders.length; idx++) {
      const pluginLoader = pluginLoaders[idx];

      if (typeof pluginLoader !== 'string') {
        continue;
      }

      const head = document.getElementsByTagName('head')[0];
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = `${pluginLoader}/plugin.css`;

      head.appendChild(link);
    }
  }

  private loadPluginSettings(imports: PluginImports<CS>) {
    // Iterate over every loaded plugin, and call `loadSettings` to manipulate the Settings Schema
    this.plugins.forEach(plugin => {
      try {
        plugin.injectSettingsSchema?.(this.options.settingsManager.addPluginSettings);
      } catch (err) {
        imports.bad.push(new Error(`Could not inject Settings Schema for Plugin: ${plugin.name}`));
      }
    });
  }
}
