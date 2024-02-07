import { EventEmitter } from 'events';
import {
  PluginManagerEmitter,
  PluginManagerEvents,
  PluginManagerOptions,
  SettingsValidatorResults
} from '../types/Managers.js';
import {
  PluginConstructor,
  PluginImportResults,
  PluginInstance,
  PluginInstances,
  PluginLoaders,
  PluginRegistrationOptions,
  PluginSettingsBase
} from '../types/Plugin.js';
import { FormEntry } from '../utils/Forms.js';
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

  unregisterPlugins() {
    const numPlugins = this._plugins.length;

    // Unregister existing plugins, and remove from list
    for (let idx = numPlugins - 1; idx >= 0; idx--) {
      const plugin = this._plugins[idx];
      plugin.unregisterPlugin?.();
      this._plugins.splice(idx, 1);
    }

    // Delete all link[data-plugin] nodes
    const links = globalThis.document.querySelectorAll('head link[data-plugin]');
    links.forEach(link => link.remove());

    this.emit(PluginManagerEvents.UNLOADED);
  }

  loadPlugins = async () => {
    // Unregister Plugins before loading any new ones
    this.unregisterPlugins();

    const { defaultPlugin } = this.options;

    // Load all URLs for desired plugins
    const pluginLoaders: PluginLoaders<PluginSettings> = this.pluginBaseUrls() as PluginLoaders<PluginSettings>;
    // Prepend Default plugin to instantiate/import
    pluginLoaders.unshift(defaultPlugin);
    // Perform Imports/Intantiations
    const importResults = await this.importModules(pluginLoaders);

    // Bootstrap the Plugins loaded
    await this.registerPlugins(importResults);

    this.emit(PluginManagerEvents.LOADED, this._plugins);

    if (0 !== importResults.bad.length) {
      // TODO: Turn (imports) into a return value and handle in Renderers/etc to call showError
      throw new Error(importResults.bad.join('<br /><br />'));
    }
  };

  validateSettings = (): SettingsValidatorResults<PluginSettings> => {
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
      pluginUrls = customPlugins;
    } else if (plugins) {
      // At runtime, `plugins` may actually be a single string due to deserializing
      // URLSearchParams that only had one specified plugin
      pluginUrls = plugins
        // Convert `true:SomePluginName` -> `SomePluginName`
        .map(invalidPluginData => invalidPluginData.split(':')[1])
        // Iterate getting the full plugin path
        .map(this.getPluginPath);
    }

    return pluginUrls;
  }

  private async importModules(pluginLoaders: PluginLoaders<PluginSettings>) {
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
        const injectedSettings = structuredClone(registration.settings);
        injectedSettings?.values.push({
          inputType: 'fieldgroup',
          label: 'Plugin Metadata',
          name: `pluginMetadata-${plugin.name}`,
          values: this.getPluginMetaInputs(plugin, registration)
        });

        pluginRegistrar.registerSettings(injectedSettings);
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
        pluginRegistrar.registerEvents(plugin, registration.events?.receives);
      } catch (err) {
        importResults.bad.push(new Error(`Could not Register Events for Plugin: ${plugin.name}`));
      }

      // Load Styles from Plugins
      if (registration.stylesheet) {
        pluginRegistrar.registerStylesheet(registration.stylesheet.href);
      }
    }
  }

  getPluginMetaInputs(plugin: PluginInstance<PluginSettings>, registration: PluginRegistrationOptions): FormEntry[] {
    return [
      {
        inputType: 'text',
        name: ' ',
        label: 'Name',
        defaultValue: plugin.name
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Version',
        defaultValue: plugin.version
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Priority',
        defaultValue: plugin.priority || 'N/A'
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Middleware Chain(s)',
        defaultValue: registration.middlewares && Object.keys(registration.middlewares).join(', ')
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Listening',
        defaultValue: registration.events?.receives && Object.keys(registration.events?.receives).join(', ')
      },
      {
        inputType: 'text',
        name: ' ',
        label: 'Event(s) Sent',
        defaultValue: registration.events?.sends && registration.events?.sends.join(', ')
      }
    ];
  }
}
