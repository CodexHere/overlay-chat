/**
 * Initiates and Maintains the Application Lifecycle
 *
 * @module
 */

import { BusManager } from './managers/BusManager.js';
import { DisplayManager } from './managers/DisplayManager.js';
import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { TemplateManager } from './managers/TemplateManager.js';
import { AppRenderer } from './renderers/AppRenderer.js';
import { SettingsRenderer } from './renderers/SettingsRenderer.js';
import { AppBootstrapperOptions, PluginManagerEmitter, PluginManagerEvents } from './types/Managers.js';
import { PluginImportResults, PluginSettingsBase } from './types/Plugin.js';
import { RendererConstructor, RendererInstance } from './types/Renderers.js';
import { AddStylesheet } from './utils/DOM.js';

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
 * // Start the App once DOM has loaded
 * document.addEventListener('DOMContentLoaded', () => {
 *   const bootstrapper = new AppBootstrapper<AppSettings_Chat>({
 *     needsAppRenderer: true,
 *     needsSettingsRenderer: true,
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
  /** Instance of the {@link DisplayManager | `DisplayManager`}. */
  private displayManager?: DisplayManager;
  /** Instance of the {@link BusManager | `BusManager`}. */
  private busManager?: BusManager<PluginSettings>;
  /** Instance of the {@link SettingsManager | `SettingsManager`}. */
  private settingsManager?: SettingsManager<PluginSettings>;
  /** Instance of the {@link PluginManager | `PluginManager`} (as a {@link PluginManagerEmitter | `PluginManagerEmitter`}). */
  private pluginManager?: PluginManagerEmitter<PluginSettings>;
  /** Instance of the {@link TemplateManager | `TemplateManager`}. */
  private templateManager?: TemplateManager;

  /**
   * Create a new {@link AppBootstrapper | `AppBootstrapper`}.
   *
   * @param bootstrapOptions - Incoming Options for the {@link AppBootstrapper | `AppBootstrapper`}.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(public bootstrapOptions: AppBootstrapperOptions<PluginSettings>) {}

  /**
   * Kickoff the entire Application's Lifecycle!
   */
  async init() {
    try {
      this.buildManagers();
      this.bindManagerEvents();
      await this.initManagers();
      await this.initRenderer();
    } catch (err) {
      this.displayManager?.showError(err as Error);
    }
  }

  /**
   * Build Manager Instances
   */
  private async buildManagers() {
    this.busManager = new BusManager();
    this.settingsManager = new SettingsManager<PluginSettings>(globalThis.location.href);
    this.templateManager = new TemplateManager();

    this.displayManager = new DisplayManager({
      getTemplates: this.templateManager.getTemplates
    });

    this.pluginManager = new PluginManager({
      defaultPlugin: this.bootstrapOptions.defaultPlugin,
      getSettings: this.settingsManager.getSettings,

      pluginRegistrar: {
        registerMiddleware: this.busManager.registerMiddleware,
        registerEvents: this.busManager.registerEvents,
        registerSettings: this.settingsManager.registerSettings,
        registerTemplates: this.templateManager.registerTemplates,
        registerStylesheet: async (_plugin, registration) => {
          if (registration?.stylesheet?.href) {
            AddStylesheet(registration?.stylesheet?.href);
          }
        }
      },

      pluginOptions: {
        emitter: this.busManager.emitter,
        getSettings: this.settingsManager.getSettings,
        getTemplates: this.templateManager.getTemplates,
        display: this.displayManager
      }
    });
  }

  /**
   * Initialize Managers in appropriate order.
   */
  private async initManagers() {
    await this.displayManager!.init();
    await this.settingsManager!.init();
    await this.busManager!.init();
    await this.pluginManager!.init();
    await this.templateManager!.init();
  }

  /**
   * Determines and Initializes a {@link RendererInstance | `RendererInstance`} to present to the User.
   *
   * > NOTE: Possible {@link RendererInstance | `RendererInstance`}s are: {@link AppRenderer | `AppRenderer`}, and {@link SettingsRenderer | `SettingsRenderer`}.
   */
  private async initRenderer() {
    const settings = this.settingsManager!.getSettings();
    const areSettingsValid = this.pluginManager!.validateSettings();

    // Force NOT configured if `forceShowSettings` is in Settings, otherwise actually check validity
    const isConfigured = (!settings.forceShowSettings && true === areSettingsValid) || false;
    const { needsSettingsRenderer, needsAppRenderer } = this.bootstrapOptions;
    // Wants a `SettingsRenderer`, and `isConfigured` is `false`
    const shouldRenderSettings = false === isConfigured && needsSettingsRenderer;
    // Wants an `AppRenderer`, and `isConfigured` is `true`
    const shouldRenderApp = true === isConfigured && needsAppRenderer;

    // Select which Renderer to instantiate...
    let rendererClass: RendererConstructor<PluginSettings> | undefined =
      shouldRenderSettings ? SettingsRenderer
      : shouldRenderApp ? AppRenderer
      : undefined;

    // If we don't have a `RendererConstructor` selected, the work here is done!
    if (!rendererClass) {
      return;
    }

    // Construct the `RendererConstructor` to instantiate a `RendererInstance`!
    const renderer: RendererInstance = new rendererClass({
      getTemplates: this.templateManager!.getTemplates,
      getSettings: this.settingsManager!.getSettings,
      setSettings: this.settingsManager!.setSettings,
      getMaskedSettings: this.settingsManager!.getMaskedSettings,
      getParsedJsonResults: this.settingsManager!.getParsedJsonResults,
      getPlugins: this.pluginManager!.getPlugins,
      pluginLoader: this.pluginManager!.registerAllPlugins,
      validateSettings: this.pluginManager!.validateSettings,
      display: this.displayManager!
    });

    // Init the Renderer
    await renderer.init();
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
    this.pluginManager!.addListener(
      PluginManagerEvents.LOADED,
      (importResults: PluginImportResults<PluginSettings>) => {
        this.busManager!.init();
        this.busManager!.disableAddingListeners();
        this.settingsManager!.updateParsedJsonResults(true);

        if (importResults.bad && 0 !== importResults.bad.length) {
          this.displayManager?.showError(importResults.bad);
        }
      }
    );

    // Upon Plugins being Unloaded, reset the `BusManager`, and the Settings Schema.
    this.pluginManager!.addListener(PluginManagerEvents.UNLOADED, () => {
      this.settingsManager!.resetSettingsSchema();
      this.busManager!.reset();
    });
  }
}
