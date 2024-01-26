import {
  BOOLEAN_TRUES,
  OverlayPluginConstructor,
  OverlayPluginInstance,
  OverlaySettings,
  PluginImports,
  PluginInstances,
  PluginLoaders,
  PluginManagerOptions
} from '../types.js';
import * as URI from '../utils/URI.js';

export class PluginManager<OS extends OverlaySettings> {
  private plugins: PluginInstances = [];

  constructor(private options: PluginManagerOptions<OS>) {}

  getPlugins(): PluginInstances {
    return this.plugins;
  }

  private getPluginPath = (pluginName: string) => {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  };

  private pluginBaseUrls() {
    let pluginUrls: string[] = [];

    const { customPlugins, plugins } = this.options.settingsManager.getSettings();

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
      plugin.unregisterPlugin?.(this.options.renderOptions);
      this.plugins.splice(idx, 1);
    }

    // Delete all link[data-plugin] nodes
    const links = globalThis.document.querySelectorAll('head link[data-plugin]');
    links.forEach(link => link.remove());
  }

  async loadPlugins() {
    // Unregister Plugins before loading any new ones
    this.unregisterPlugins();
    this.options.busManager.clearPluginRegistrations();

    const { defaultPlugin, settingsManager, busManager } = this.options;

    // Load all URLs for desired plugins
    const pluginLoaders: PluginLoaders<OS> = this.pluginBaseUrls() as PluginLoaders<OS>;
    // Prepend Default plugin to instantiate/import
    pluginLoaders.unshift(defaultPlugin);
    // Perform Imports/Intantiations
    const imports = await this.importModules(pluginLoaders);
    // Assign Plugins as the "Good" imports
    imports.good.forEach(imported => this.plugins.push(imported));

    // Sort Plugins by Priority
    this.plugins.sort(this.sortPlugins);
    // Load Settings for Plugins
    settingsManager.loadPluginSettings(this.plugins, imports);
    // Load Style for Plugin
    this.loadPluginStyles(pluginLoaders);
    // Bind Middleware
    busManager.registerPluginMiddleware(this.plugins as unknown as PluginInstances);

    if (0 !== imports.bad.length) {
      // TODO: Turn (imports) into a return value and handle in Renderers/etc to call showError
      throw new Error(imports.bad.join('<br /><br />'));
    }
  }

  private sortPlugins(a: OverlayPluginInstance, b: OverlayPluginInstance) {
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

  private async importModules(pluginLoaders: PluginLoaders<OS>) {
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
          } as PluginImports
        )
    );
  }

  private async loadPluginInstance(pluginLoadValue: string | OverlayPluginConstructor<OS>) {
    let pluginClass: OverlayPluginConstructor<OS> | undefined;

    if (typeof pluginLoadValue === 'string') {
      pluginClass = await this.importPlugin(pluginLoadValue as string);
    } else {
      pluginClass = pluginLoadValue as OverlayPluginConstructor<OS>;
    }

    // Instantiate Plugin
    try {
      // prettier-ignore
      const pluginInstance: OverlayPluginInstance = 
        new pluginClass!(
          this.options.busManager.events, 
          this.options.settingsManager.getSettings
        );

      return pluginInstance;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Plugin could not be instantiated:<br />${pluginLoadValue}<br /><br /><pre>${err.stack}</pre>`);
      }
    }
  }

  private async importPlugin(pluginBaseUrl: string) {
    try {
      let pluginClass: OverlayPluginConstructor<OS> | undefined;

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

  private loadPluginStyles(pluginLoaders: PluginLoaders<OS>) {
    for (let idx = 0; idx < pluginLoaders.length; idx++) {
      const pluginLoader = pluginLoaders[idx];

      if (typeof pluginLoader !== 'string') {
        continue;
      }

      const head = globalThis.document.getElementsByTagName('head')[0];
      const link = globalThis.document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = `${pluginLoader}/plugin.css`;
      link.setAttribute('data-plugin', 'true');

      head.appendChild(link);
    }
  }
}
