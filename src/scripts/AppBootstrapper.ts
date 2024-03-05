/**
 * Initiates and Maintains the Application Lifecycle
 *
 * @module
 */

import { DisplayContextProvider } from './ContextProviders/DisplayContextProvider.js';
import { StylesheetsContextProvider } from './ContextProviders/StylesheetsContextProvider.js';
import { BusManager } from './Managers/BusManager.js';
import { PluginManager } from './Managers/PluginManager.js';
import { SettingsManager } from './Managers/SettingsManager.js';
import { TemplateManager } from './Managers/TemplateManager.js';
import { AppRenderer } from './Renderers/AppRenderer.js';
import { ConfigurationRenderer } from './Renderers/ConfigurationRenderer.js';
import { AppBootstrapperOptions, PluginManagerEmitter, PluginManagerEvents } from './types/Managers.js';
import { PluginImportResults, PluginSettingsBase } from './types/Plugin.js';
import { RendererConstructor, RendererInstance, RendererInstanceEvents } from './types/Renderers.js';

/**
 * Initiates and Maintains the Application Lifecycle.
 *
 * This is the Kickoff for the entire Application.
 *
 * Upon Initializing, all necessary Manager classes will be built and initialized.
 * Based on validity of the supplied Settings, the {@link AppBootstrapper | `AppBootstrapper`} determines a {@link RendererConstructor | `RendererConstructor`} to construct and display for the User.
 *
 * Example Applicatin Kickoff:
 * ```js
 * import { AppBootstrapper } from './AppBootstrapper.js';
 * import Plugin_Core, { AppSettings_Chat } from './Plugin_Core.js';
 *
 * // Start the Application once DOM has loaded
 * document.addEventListener('DOMContentLoaded', () => {
 *   const bootstrapper = new AppBootstrapper<AppSettings_Chat>({
 *     needsAppRenderer: true,
 *     needsConfigurationRenderer: true,
 *     defaultPlugin: Plugin_Core
 *   });
 *
 *   bootstrapper.init();
 * });
 * ```
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class AppBootstrapper<PluginSettings extends PluginSettingsBase> {
  /** Instance of the {@link Managers/BusManager.BusManager | `BusManager`}. */
  private busManager?: BusManager;
  /** Instance of the {@link SettingsManager | `SettingsManager`}. */
  private settingsManager?: SettingsManager;
  /** Instance of the {@link PluginManager | `PluginManager`} (as a {@link types/Managers.PluginManagerEmitter | `PluginManagerEmitter`}). */
  private pluginManager?: PluginManagerEmitter<PluginSettings>;
  /** Instance of the {@link TemplateManager | `TemplateManager`}. */
  private templateManager?: TemplateManager;
  /** Instance of the {@link DisplayContextProvider | `DisplayContextProvider`} acting as a `DisplayManager`. */
  private displayContext?: DisplayContextProvider;
  /** Instance of the {@link StylesheetsContextProvider | `StylesheetsContextProvider`} acting as a `StyleManager` */
  private stylesheetContext?: StylesheetsContextProvider;
  /** Instance of the {@link RendererInstance | `RendererInstance`} chosen to present to the User. */
  private renderer?: RendererInstance;

  /**
   * Create a new {@link AppBootstrapper | `AppBootstrapper`}.
   *
   * @param bootstrapOptions - Incoming Options for the {@link AppBootstrapper | `AppBootstrapper`}.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(public bootstrapOptions: AppBootstrapperOptions) {}

  /**
   * Kickoff the entire Application's Lifecycle!
   */
  async init() {
    try {
      this.buildManagers();
      await this.initManagers();
      await this.initRenderer();
      this.bindManagerEvents();
      this.bindRendererEvents();
    } catch (err) {
      this.displayContext?.showError(err as Error);
    }
  }

  /**
   * Build Manager Instances.
   *
   * Also builds any *Global* {@link types/ContextProviders | `ContextProviders`}.
   */
  private async buildManagers() {
    this.busManager = new BusManager();
    this.templateManager = new TemplateManager();
    this.stylesheetContext = new StylesheetsContextProvider();
    this.displayContext = new DisplayContextProvider(this.templateManager);
    this.settingsManager = new SettingsManager(globalThis.location.href);

    this.pluginManager = new PluginManager({
      defaultPlugin: this.bootstrapOptions.defaultPlugin,

      managers: {
        bus: this.busManager,
        display: this.displayContext,
        settings: this.settingsManager,
        stylesheets: this.stylesheetContext,
        template: this.templateManager
      }
    });
  }

  /**
   * Initialize Managers in appropriate order.
   */
  private async initManagers() {
    await this.settingsManager!.init();
    await this.busManager!.init();
    await this.templateManager!.init();
    await this.pluginManager!.init();
  }

  /**
   * Determines and Initializes a {@link RendererInstance | `RendererInstance`} to present to the User.
   *
   * > NOTE: Possible {@link RendererInstance | `RendererInstance`}s are: {@link AppRenderer | `AppRenderer`}, and {@link ConfigurationRenderer | `ConfigurationRenderer`}.
   */
  private async initRenderer() {
    const settings = this.settingsManager!.get();
    const areSettingsValid = this.pluginManager!.validateSettings();

    // Force NOT configured if `forceShowSettings` is in Settings, otherwise actually check validity
    const isConfigured = (!settings.forceShowSettings && true === areSettingsValid) || false;
    const { needsConfigurationRenderer, needsAppRenderer } = this.bootstrapOptions;
    // Wants a `ConfigurationRenderer`, and `isConfigured` is `false`
    const shouldRenderSettings = false === isConfigured && needsConfigurationRenderer;
    // Wants an `AppRenderer`, and `isConfigured` is `true`
    const shouldRenderApp = true === isConfigured && needsAppRenderer;

    // Select which Renderer to instantiate...
    let rendererClass: RendererConstructor | undefined =
      shouldRenderSettings ? ConfigurationRenderer
      : shouldRenderApp ? AppRenderer
      : undefined;

    // If we don't have a `RendererConstructor` selected, the work here is done!
    if (!rendererClass) {
      return;
    }

    this.renderer = new rendererClass({
      template: this.templateManager!,
      settings: this.settingsManager!,
      plugin: this.pluginManager!,
      display: this.displayContext!
    });

    // Init the Renderer
    await this.renderer.init();
  }

  /**
   * Bind Events that are sent from various Managers.
   *
   * > These are an IoC approach to managing the Lifecycle without requiring
   * a lot of injected dependencies.
   */
  private bindManagerEvents() {
    // Upon Plugins being Loaded, we want to re-init the `BusManager`,
    // and re-cache the Parsed JSON Results.
    // Show Errors if there were any failed imports of Plugins.
    this.pluginManager!.addListener(PluginManagerEvents.LOADED, (importResults: PluginImportResults) => {
      this.busManager!.init();
      this.busManager!.disableAddingListeners();
      this.settingsManager!.updateProcessedSchema(importResults.good);

      if (importResults.bad && 0 !== importResults.bad.length) {
        this.displayContext?.showError(importResults.bad);
      }
    });

    // Upon Plugins being Unloaded, reset the `BusManager`, and the Settings Schema.
    this.pluginManager!.addListener(PluginManagerEvents.UNLOADED, () => {
      this.busManager!.reset();
    });
  }

  /**
   * Bind Events that are sent from the active {@link RendererInstance | `RendererInstance`}.
   *
   * > These are an IoC approach to managing the Lifecycle without requiring
   * a lot of injected dependencies.
   */
  private bindRendererEvents() {
    // Upon Plugin List being changed, we want to reload all Plugins
    // and restart the `RendererInstance`.
    this.renderer?.addListener(RendererInstanceEvents.PLUGINS_STALE, async () => {
      // Reloads all plugins (first unloads)
      await this.pluginManager?.registerAllPlugins();
      // Re-init the active `RendererInstance`, which should effectively
      // restart the portion of the Application the User is presented.
      await this.renderer?.init();
    });
  }
}
