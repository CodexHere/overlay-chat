/**
 * Manages Plugin Lifecycles for the Application
 *
 * @module
 */

import { EventEmitter } from 'events';
import { PluginManagerEmitter, PluginManagerEvents, PluginManagerOptions } from '../types/Managers.js';
import {
  PluginConstructor,
  PluginImportResults,
  PluginInstance,
  PluginInstances,
  PluginLoader,
  PluginLoaders,
  PluginSettingsBase
} from '../types/Plugin.js';
import { FormValidatorResults } from '../utils/Forms.js';
import * as URI from '../utils/URI.js';
import { IsValidValue } from '../utils/misc.js';

/**
 * Manages Plugin Lifecycles for the Application.
 *
 * Registers and Unregisters Plugins, as well as facade Validating Plugin Settings.
 *
 * This class utilizes the {@link types/Plugin.PluginRegistrar | `PluginRegistrar`} for every {@link PluginInstance | `PluginInstance`},
 * Registering various parts of a Plugin.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class PluginManager<PluginSettings extends PluginSettingsBase>
  extends EventEmitter
  implements PluginManagerEmitter<PluginSettings>
{
  /**
   * Currently known Registered {@link types/Plugin.PluginInstances | `PluginInstances`}.
   */
  private _plugins: PluginInstances<PluginSettings> = [];

  /**
   * Create a new {@link PluginManager | `PluginManager`}.
   *
   * @param options - Incoming Options for the {@link PluginManager | `PluginManager`}.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private options: PluginManagerOptions<PluginSettings>) {
    super();
  }

  /**
   * Accessor Function for Registered Plugins.
   *
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  getPlugins = (): PluginInstances<PluginSettings> => {
    return this._plugins;
  };

  /**
   * Initialize the `PluginManger`.
   *
   * This dynamically instantiates built-in plugins, dynamically imports/instantiates custom plugins,
   * as well as Registers various parts of a Plugin.
   */
  async init() {
    // Load and register new plugin
    await this.registerAllPlugins();
  }

  /**
   * Iteratively Unregister ALL currently known Registered {@link PluginInstances | `PluginInstances`}.
   */
  async unregisterAllPlugins() {
    const numPlugins = this._plugins.length;

    // Unregister existing plugins, and remove from list.
    // NOTE: We're starting from the end of the list to avoid changing index counts on removals.
    for (let idx = numPlugins - 1; idx >= 0; idx--) {
      const plugin = this._plugins[idx];
      await plugin.unregisterPlugin?.();
      this._plugins.splice(idx, 1);
    }

    // Delete all link[data-plugin] nodes
    const links = globalThis.document.querySelectorAll('head link[data-plugin]');
    links.forEach(link => link.remove());

    // Emit to the System that the Plugins are all Unloaded!
    this.emit(PluginManagerEvents.UNLOADED);
  }

  /**
   * Iteratively Register Plugins defined in the System Settings.
   *
   * This will Unregister ALL currently known Registered {@link PluginInstances | `PluginInstances`} first, and import/instantiate as necessary.
   */
  registerAllPlugins = async () => {
    // Unregister Plugins before loading any new ones
    await this.unregisterAllPlugins();

    const { defaultPlugin } = this.options;

    // Load all URLs for desired plugins
    const pluginLoaders: PluginLoaders<PluginSettings> = this.pluginBaseUrls() as PluginLoaders<PluginSettings>;
    // Add Default plugin to instantiate/import
    pluginLoaders.add(defaultPlugin);
    // Perform Imports/Intantiations
    const importResults = await this.loadAllPlugins(pluginLoaders);

    // Bootstrap the Plugins loaded
    await this.registerImportedPlugins(importResults);

    // Emit to the System that the Plugins are all Loaded!
    this.emit(PluginManagerEvents.LOADED, importResults);
  };

  /**
   * Iteratively Validate Settings for ALL currently known Registered {@link PluginInstances | `PluginInstances`}.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
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

  /**
   * Normalize a Plugin Name to use as a URL.
   *
   * If the incoming `pluginName` is already a URL, we leave it alone, otherwise we build a URL
   * based on an assumed location.
   *
   * @param pluginName - Name or URL of Plugin.
   */
  private getPluginPath = (pluginName: string) => {
    return pluginName.startsWith('http') ? pluginName : `${URI.BaseUrl()}/plugins/${pluginName}`;
  };

  /**
   * Builds an array of URL strings from `customPlugins` and `plugins` from the Settings.
   */
  private pluginBaseUrls() {
    let pluginUrls: string[] = [];

    const { customPlugins, plugins } = this.options.getSettings();

    pluginUrls.push(...this.getCustomPluginsSettings(customPlugins));
    pluginUrls.push(...this.getPluginsSettings(plugins));

    pluginUrls = this.normalizePluginUrls(pluginUrls);

    return new Set(pluginUrls);
  }

  /**
   * Return Custom Plugins from Settings.
   *
   * @param customPlugins - Depending on Settings, could be a single `string`, or an `Array` of them.
   */
  private getCustomPluginsSettings(customPlugins?: string | string[]) {
    return (
      // No Custom Plugins!
      !customPlugins ? []
        // Custom Plugins is an Array, return it
      : true === Array.isArray(customPlugins) ? customPlugins
        // Custom Plugins is a String, array/return it
      : [customPlugins]
    );
  }

  /**
   * Return Plugins from Settings.
   *
   * > Will also first clean up from how the Settings are [De]Serialized.
   *
   * @param plugins - Depending on Settings, could be a single `string`, or an `Array` of them.
   */
  private getPluginsSettings(plugins?: string | string[]) {
    return (
      // No Plugins!
      !plugins ? []
        // Plugins is an Array, return it (after cleaning it up)
      : true === Array.isArray(plugins) ?
        plugins
          // Convert `index:SomePluginName` -> `SomePluginName`
          // i.e., checkbox/radio lists from `Utils::Forms` will have
          // value set as described, so we need just the plugin name to get the url
          .map(invalidPluginData => invalidPluginData.split(':')[1])
          // Iterate getting the full plugin path
          .map(pluginPath => this.getPluginPath(pluginPath))
        // Plugins is a String, array/return it
      : [this.getPluginPath(plugins)]
    );
  }

  /**
   * Normalize URLs by removing invalid values, as well as ensuring a `.js` file is targeted.
   *
   * > Defaults to targeting `index.js` if one is not identified.
   *
   * @param pluginUrls - Incoming URLs to Normalize.
   */
  private normalizePluginUrls(pluginUrls: string[]) {
    return pluginUrls.reduce((urls, pUrl) => {
      // Only allow defined URLs (ie, skip undefined)
      if (false === IsValidValue(pUrl)) {
        return urls;
      }

      // Cheesy JS extension check
      const fileExtension = pUrl.split('.').pop();
      if ('js' !== fileExtension) {
        // Normalize to target an `index.js` if a JS file isn't specified
        pUrl += '/index.js';
      }

      urls.push(pUrl);

      return urls;
    }, [] as string[]);
  }

  /**
   * Attempts to load all Plugins into the System.
   *
   * Plugins that fail to load will have their `Error`s collected for return.
   *
   * @param pluginLoaders - Plugins we wish to dynamically import/instantiate.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  private async loadAllPlugins(
    pluginLoaders: PluginLoaders<PluginSettings>
  ): Promise<PluginImportResults<PluginSettings>> {
    const promises: Promise<PluginInstance<PluginSettings> | undefined>[] = [];
    pluginLoaders.forEach(async pluginUrl => promises.push(this.createPluginInstance(pluginUrl)));

    const results = await Promise.allSettled(promises);

    return (
      results
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
          // Input
          {
            good: [],
            bad: []
          } as PluginImportResults<PluginSettings>
        )
    );
  }

  /**
   * Creates a {@link PluginInstance | `PluginInstance`} from a {@link PluginLoader | `PluginLoader`}.
   *
   * @param pluginLoader - Either the URL to a Plugin to dynamically import, or a Constructor for a Plugin.
   */
  private async createPluginInstance(pluginLoader: PluginLoader<PluginSettings>) {
    let pluginClass: PluginConstructor<PluginSettings> | undefined;

    // Dynamically Import or assign the `PluginLoader` as the `PluginConstructor`
    if (typeof pluginLoader === 'string') {
      pluginClass = await this.importPlugin(pluginLoader as string);
    } else {
      pluginClass = pluginLoader as PluginConstructor<PluginSettings>;
    }

    // Instantiate Plugin
    try {
      return new pluginClass!(this.options.pluginOptions);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`Plugin could not be instantiated:<br />${pluginLoader}<br /><br /><pre>${err.stack}</pre>`);
      }
    }
  }

  /**
   * Dynamically Imports a remote {@link PluginConstructor | `PluginConstructor`} through a URL.
   *
   * @param pluginBaseUrl - URL to attempt dynamically importing as a {@link PluginConstructor | `PluginConstructor`}.
   */
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

  /**
   * Sorts Plugins by `priority`, if it has one.
   *
   * @param a - Plugin A
   * @param b - Plugin B
   */
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

  /**
   * Utilize the {@link types/Plugins.PluginRegistrar | `PluginRegistrar`} to Register various parts of a Plugin.
   *
   * @param importResults - Result mapping after attempted Imports of Plugins.
   */
  private async registerImportedPlugins(importResults: PluginImportResults<PluginSettings>) {
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
