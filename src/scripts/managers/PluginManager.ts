import { EventEmitter } from 'events';
import { PluginManagerEmitter, PluginManagerEvents, PluginManagerOptions } from '../types/Managers.js';
import {
  PluginConstructor,
  PluginImportResults,
  PluginInstance,
  PluginInstances,
  PluginLoaders,
  PluginSettingsBase
} from '../types/Plugin.js';
import { FormValidatorResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';

export class PluginManager<PluginSettings extends PluginSettingsBase>
  extends EventEmitter
  implements PluginManagerEmitter<PluginSettings>
{
  private _plugins: PluginInstances<PluginSettings> = [];

  constructor(private options: PluginManagerOptions<PluginSettings>) {
    super();
  }

  getPlugins = (): PluginInstances<PluginSettings> => {
    return this._plugins;
  };

  async init() {
    // Load and register new plugin
    await this.loadPlugins();
  }

  async unregisterPlugins() {
    const numPlugins = this._plugins.length;

    // Unregister existing plugins, and remove from list
    for (let idx = numPlugins - 1; idx >= 0; idx--) {
      const plugin = this._plugins[idx];
      await plugin.unregisterPlugin?.();
      this._plugins.splice(idx, 1);
    }

    // Delete all link[data-plugin] nodes
    const links = globalThis.document.querySelectorAll('head link[data-plugin]');
    links.forEach(link => link.remove());

    this.emit(PluginManagerEvents.UNLOADED);
  }

  loadPlugins = async () => {
    // Unregister Plugins before loading any new ones
    await this.unregisterPlugins();

    const { defaultPlugin } = this.options;

    // Load all URLs for desired plugins
    const pluginLoaders: PluginLoaders<PluginSettings> = this.pluginBaseUrls() as PluginLoaders<PluginSettings>;
    // Add Default plugin to instantiate/import
    pluginLoaders.add(defaultPlugin);
    // Perform Imports/Intantiations
    const importResults = await this.importModules(pluginLoaders);

    // Bootstrap the Plugins loaded
    await this.registerPlugins(importResults);

    this.emit(PluginManagerEvents.LOADED, importResults);
  };

  validateSettings = (): FormValidatorResults<PluginSettings> => {
    let errorMapping = {};

    this._plugins.forEach(plugin => {
      const error = plugin.isConfigured?.();

      if (!error || true === error) {
        return;
      }

      errorMapping = {
        ...errorMapping,
        ...error
      };
    });

    // Return Error Map if
    return 0 !== Object.keys(errorMapping).length ? errorMapping : true;
  };

  private getPluginPath = (pluginName: string) => {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  };

  private pluginBaseUrls() {
    let pluginUrls: string[] = [];

    const { customPlugins, plugins } = this.options.getSettings();

    if (customPlugins) {
      // Incoming type is an Array already, add each of them
      if (true === Array.isArray(customPlugins)) {
        pluginUrls.push(...customPlugins);
      } else {
        // User only supplied one, Settings didn't know to convert to array for us,
        // so we add just the one incoming value as string
        pluginUrls.push(customPlugins);
      }
    }

    if (plugins) {
      // Incoming type is an Array already, add each of them
      if (true === Array.isArray(plugins)) {
        plugins
          // Convert `index:SomePluginName` -> `SomePluginName`
          // i.e., checkbox/radio lists from `Utils::Forms` will have
          // value set as described, so we need just the plugin name to get the url
          .map(invalidPluginData => invalidPluginData.split(':')[1])
          .forEach(
            // Iterate getting the full plugin path
            pluginPath => pluginUrls.push(this.getPluginPath(pluginPath))
          );
      } else {
        // User only supplied one, Settings didn't know to convert to array for us,
        // so we add just the one incoming value as string
        pluginUrls.push(plugins);
      }
    }

    const retUrls: Set<string> = new Set();

    // Default to `index.js` if a JS file isn't targeted
    pluginUrls.forEach(pUrl => {
      if (!pUrl) {
        return;
      }

      const fileExtension = pUrl.split('.').pop();

      if ('js' !== fileExtension) {
        pUrl += '/index.js';
      }

      retUrls.add(pUrl);
    });

    return retUrls;
  }

  private async importModules(
    pluginLoaders: PluginLoaders<PluginSettings>
  ): Promise<PluginImportResults<PluginSettings>> {
    const promises: Promise<PluginInstance<PluginSettings> | undefined>[] = [];
    pluginLoaders.forEach(async pluginUrl => promises.push(this.loadPluginInstance(pluginUrl)));

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
          } as PluginImportResults<PluginSettings>
        )
    );
  }

  private async loadPluginInstance(pluginLoadValue: string | PluginConstructor<PluginSettings>) {
    let pluginClass: PluginConstructor<PluginSettings> | undefined;

    if (typeof pluginLoadValue === 'string') {
      pluginClass = await this.importPlugin(pluginLoadValue as string);
    } else {
      pluginClass = pluginLoadValue as PluginConstructor<PluginSettings>;
    }

    // Instantiate Plugin
    try {
      return new pluginClass!(this.options.pluginOptions);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Plugin could not be instantiated:<br />${pluginLoadValue}<br /><br /><pre>${err.stack}</pre>`);
      }
    }
  }

  private async importPlugin(pluginBaseUrl: string) {
    try {
      let pluginClass: PluginConstructor<PluginSettings> | undefined;

      // If a Custom Theme is supplied, we'll expect it to be a full URL, otherwise we'll formulate a URL.
      // This allows us to ensure vite will not attempt to package the plugin on our behalf, and will truly
      //   import from a remote file.
      const pluginLoad = await import(/* @vite-ignore */ `${pluginBaseUrl}`);
      pluginClass = pluginLoad.default;

      if (!pluginClass) {
        if (pluginLoad) {
          throw new Error('Missing `default` export in Plugin Module!');
        }
      }

      return pluginClass;
    } catch (err) {
      if (err instanceof TypeError) {
        console.error(err);
        throw new Error(`Plugin does not exist at URL: ${pluginBaseUrl}`);
      } else if (err instanceof Error) {
        throw new Error(`Could not dynamically load Plugin:<br />${pluginBaseUrl}<br /><br />${err.message}`);
      }
    }
  }

  private sortPlugins(a: PluginInstance<PluginSettingsBase>, b: PluginInstance<PluginSettingsBase>) {
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

  private async registerPlugins(importResults: PluginImportResults<PluginSettings>) {
    const { pluginRegistrar } = this.options;

    // Assign Plugins from the "Good" imports
    this._plugins.push(...importResults.good);
    // Sort Plugins by Priority
    this._plugins.sort(this.sortPlugins);

    // Iterate over every loaded plugin, and bootstrap in appropriate order
    for (const plugin of this._plugins) {
      const registration = await plugin.registerPlugin?.();

      if (!registration) {
        continue;
      }

      // Load Settings Schemas from Plugins
      try {
        await pluginRegistrar.registerSettings(plugin, registration);
      } catch (err) {
        importResults.bad.push(new Error(`Could not inject Settings Schema for Plugin: ${plugin.name}`));
      }

      // Register Middleware Chains from Plugins
      try {
        pluginRegistrar.registerMiddleware(plugin, registration.middlewares);
      } catch (err) {
        importResults.bad.push(new Error(`Could not Register Middleware for Plugin: ${plugin.name}`));
      }

      // Register Events from Plugins
      try {
        pluginRegistrar.registerEvents(plugin, registration.events?.recieves);
      } catch (err) {
        importResults.bad.push(new Error(`Could not Register Events for Plugin: ${plugin.name}`));
      }

      // Register Templates from Plugins
      try {
        pluginRegistrar.registerTemplates(registration.templates);
      } catch (err) {
        importResults.bad.push(new Error(`Could not Register Templates for Plugin: ${plugin.name}`));
      }

      // Load Styles from Plugins
      if (registration.stylesheet) {
        pluginRegistrar.registerStylesheet(registration.stylesheet);
      }
    }
  }
}
