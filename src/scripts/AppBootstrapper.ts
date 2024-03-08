/**
 * Initiates and Maintains the Application Lifecycle
 *
 * @module
 */

import { DisplayContextProvider } from './ContextProviders/DisplayContextProvider.js';
import { StylesheetsContextProvider } from './ContextProviders/StylesheetsContextProvider.js';
import { BusManager } from './Managers/BusManager.js';
import { LifecycleManager } from './Managers/LifecycleManager.js';
import { PluginManager } from './Managers/PluginManager.js';
import { SettingsManager } from './Managers/SettingsManager.js';
import { TemplateManager } from './Managers/TemplateManager.js';
import { AppRenderer } from './Renderers/AppRenderer.js';
import { ConfigurationRenderer } from './Renderers/ConfigurationRenderer.js';
import {
  AppBootstrapperEmitter,
  CoreEvents,
  PluginManagerEmitter,
  RendererStartedHandlerOptions
} from './types/Events.js';
import { AppBootstrapperOptions, LockHolder } from './types/Managers.js';
import { RenderMode, RendererConstructor, RendererInstance } from './types/Renderers.js';
import { EnhancedEventEmitter } from './utils/EnhancedEventEmitter.js';

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
 * import Plugin_Core from './Plugin_Core.js';
 *
 * // Start the Application once DOM has loaded
 * document.addEventListener('DOMContentLoaded', () => {
 *   const bootstrapper = new AppBootstrapper({
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
export class AppBootstrapper extends EnhancedEventEmitter implements AppBootstrapperEmitter, LockHolder {
  /** Semaphore indicating Lock status. When Locked, Registration and Config-only access like manipulating Settings are unavailable. */
  isLocked: boolean = false;

  /** Which `<mode>` to Render (for Plugins). */
  renderMode: RenderMode = 'configure';

  /** Instance of the {@link Managers/BusManager.BusManager | `BusManager`}. */
  private busManager?: BusManager;

  /** Instance of the {@link SettingsManager | `SettingsManager`}. */
  private settingsManager?: SettingsManager;

  /** Instance of the {@link PluginManager | `PluginManager`} (as a {@link types/Managers.PluginManagerEmitter | `PluginManagerEmitter`}). */
  private pluginManager?: PluginManagerEmitter;

  /** Instance of the {@link TemplateManager | `TemplateManager`}. */
  private templateManager?: TemplateManager;

  /** Instance of the {@link DisplayContextProvider | `DisplayContextProvider`} acting as a `DisplayManager`. */
  private displayContext?: DisplayContextProvider;

  /** Instance of the {@link StylesheetsContextProvider | `StylesheetsContextProvider`} acting as a `StyleManager` */
  private stylesheetContext?: StylesheetsContextProvider;

  /** Instance of the {@link RendererInstance | `RendererInstance`} chosen to present to the User. */
  private renderer?: RendererInstance;

  /** Instance of the {@link LifecycleManager | `LifecycleManager`} managing Application Lifecycle. */
  private lifecycleManager?: LifecycleManager;

  /**
   * Create a new {@link AppBootstrapper | `AppBootstrapper`}.
   *
   * @param bootstrapOptions - Incoming Options for the {@link AppBootstrapper | `AppBootstrapper`}.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(public bootstrapOptions: AppBootstrapperOptions) {
    super();
  }

  /**
   * Kickoff the entire Application's Lifecycle!
   */
  async init() {
    try {
      this.buildManagers();
      await this.initManagers();
      await this.initRenderer();
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
    this.busManager = new BusManager(this);
    this.templateManager = new TemplateManager(this);
    this.stylesheetContext = new StylesheetsContextProvider(this);
    this.displayContext = new DisplayContextProvider(this.templateManager);
    this.settingsManager = new SettingsManager(this, globalThis.location.href);

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

    this.lifecycleManager = new LifecycleManager({
      bootstrapper: this,
      bus: this.busManager,
      display: this.displayContext,
      plugin: this.pluginManager,
      settings: this.settingsManager,
      stylesheets: this.stylesheetContext,
      template: this.templateManager
    });
  }

  /**
   * Initialize Managers in appropriate order.
   */
  private async initManagers() {
    await this.lifecycleManager!.init();
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
    const shouldrenderConfiguration = false === isConfigured && needsConfigurationRenderer;
    // Wants an `AppRenderer`, and `isConfigured` is `true`
    const shouldRenderApp = true === isConfigured && needsAppRenderer;

    // Select which Renderer to instantiate...
    const rendererClass: RendererConstructor | undefined =
      shouldrenderConfiguration ? ConfigurationRenderer
      : shouldRenderApp ? AppRenderer
      : undefined;

    // Store the `renderMode` for future renders.
    this.renderMode = isConfigured ? 'app' : 'configure';

    // If we don't have a `RendererConstructor` selected, the work here is done!
    if (!rendererClass) {
      return;
    }

    // Instantiate our `RendererInstance`
    this.renderer = new rendererClass({
      bus: this.busManager!,
      display: this.displayContext!,
      plugin: this.pluginManager!,
      settings: this.settingsManager!,
      stylesheets: this.stylesheetContext!,
      template: this.templateManager!
    });

    // Emit the `RendererStart` Event on the "Internal" Scope.
    // This will also:
    // * "Lock" the Application.
    // * Re-emit the event to the "Plugin" Scope.
    (this as AppBootstrapperEmitter).emit(CoreEvents.RendererStarted, {
      renderer: this.renderer,
      renderMode: this.renderMode,
      ctx: {
        bus: this.busManager?.context,
        display: this.displayContext,
        settings: this.settingsManager?.context,
        stylesheets: this.stylesheetContext,
        template: this.templateManager?.context
      }
    } as RendererStartedHandlerOptions);
  }
}
