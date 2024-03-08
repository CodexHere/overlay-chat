/**
 * Manages Lifecycle of Application Runtime
 *
 * @module
 */

import { CoreEvents, RendererStartedHandlerOptions } from '../types/Events.js';
import { LifecycleManagerOptions } from '../types/Managers.js';
import { PluginImportResults } from '../types/Plugin.js';

/**
 * Manages Lifecycle of Application Runtime.
 */
export class LifecycleManager {
  constructor(private actors: LifecycleManagerOptions) {}

  /**
   * Initialize the {@link LifecycleManager | `LifecycleManager`}.
   */
  async init() {
    this.bindManagerEvents();
  }

  /**
   * Accessor Function for setting whether the Application is Locked or not.
   */
  private set isLocked(isLocked: boolean) {
    this.actors.bootstrapper.isLocked = this.actors.bus.emitter.disableAddingListeners = isLocked;
  }

  /**
   * Bind Events that are sent from various Managers.
   *
   * > These are an IoC approach to managing the Lifecycle without requiring
   * a lot of injected dependencies.
   */
  private bindManagerEvents() {
    const { bootstrapper, plugin } = this.actors;

    // Upon Plugins being Loaded, we want to re-init the `BusManager`,
    // and re-cache the Parsed JSON Results.
    // Show Errors if there were any failed imports of Plugins.
    plugin.addListener(CoreEvents.PluginsLoaded, this.onPluginsLoaded);
    plugin.addListener(CoreEvents.PluginsUnloaded, this.onPluginsUnloaded);

    bootstrapper.addListener(CoreEvents.RendererStarted, this.onRendererStarted);
  }

  /**
   * Upon Plugins being Unloaded, reset the `BusManager`.
   */
  private onPluginsUnloaded = () => {
    this.actors.bus.reset();
  };

  /**
   * Event Handler when ALL Plugins are Loaded.
   *
   * Here we're able to show errors on failed imports, and initialize our Bus.
   *
   * @param importResults - Import Results from {@link Managers/PluginManager.PluginManager#registerAllPlugins | `PluginManager::registerAllPlugins()`} (and ultimately {@link Managers/PluginManager.PluginManager#loadAllPlugins | `PluginManager::loadAllPlugins()`})
   */
  private onPluginsLoaded = (importResults: PluginImportResults) => {
    const { bus, display } = this.actors;

    bus.init();

    if (importResults.bad && 0 !== importResults.bad.length) {
      display?.showError(importResults.bad);
    }
  };

  /**
   * Bind Events that are sent from the active {@link RendererInstance | `RendererInstance`}.
   *
   * These are only possible to Bind *once* the {@link AppBootstrapper | `AppBootstrapper`} has fired the {@link types/Events.CoreEvents#RendererStart | `RendererStart`} Event.
   *
   * This handler will initially proxy the event to the Plugin-avaialble Bus, as well as
   * re-fire the event when handling `configure` render Lifecycle.
   *
   * > These are an IoC approach to managing the Lifecycle without requiring
   * a lot of injected dependencies.
   *
   * @param options - Broadcasted Start options when a {@link RendererInstance | `RendererInstance`} has been selected and presented to the User.
   */
  private onRendererStarted = async (options: RendererStartedHandlerOptions) => {
    // Bind Events for `configure` Render Mode.
    await this.bindConfigureEvents(options);

    // Initialize the Run Phase
    await this.initRunPhase(options);
  };

  /**
   * Bind Events for the `configure` Render Mode.
   *
   * @param options - Broadcasted Start options when a {@link RendererInstance | `RendererInstance`} has been selected and presented to the User.
   */
  private async bindConfigureEvents(options: RendererStartedHandlerOptions) {
    // Only do this for `configure` mode!
    if (!options.renderer || options.renderMode !== 'configure') {
      return;
    }

    // `configure` Lifecycle has the potential to change the Plugins we want to load.
    // Upon Plugin List being changed, we want to reload all Plugins and re-Event
    // the `CoreEvents.RendererStarted` event with curried `options`.
    options.renderer.addListener(CoreEvents.PluginsChanged, this.onPluginsChanged.bind(this, options));

    // `configure` Lifecycle has the potential to change the Settings Schema we want to present to the User.
    // Upon Settings Schema being changed, we want to re-render.
    this.actors.settings.addListener(CoreEvents.SchemaChanged, this.onSchemaChanged.bind(this, options));
  }

  /**
   * Event Handler for when the Plugin List has changed, and Plugins need reloading.
   *
   * > This should only occur during the `configure` Render Mode!
   *
   * @param options - Broadcasted Start options when a {@link RendererInstance | `RendererInstance`} has been selected and presented to the User.
   */
  private onPluginsChanged = async (options: RendererStartedHandlerOptions) => {
    const { plugin } = this.actors;

    // Unlock Application so we can Unregister Plugins.
    this.isLocked = false;

    // Reloads all plugins (first unloads)
    await plugin.registerAllPlugins();

    await this.initRunPhase(options);
  };

  /**
   * Event Handler for when the Settings Schema has changed, and Renderer need reloading.
   *
   * > This should only occur during the `configure` Render Mode!
   *
   * @param options - Broadcasted Start options when a {@link RendererInstance | `RendererInstance`} has been selected and presented to the User.
   */
  private onSchemaChanged = async (options: RendererStartedHandlerOptions) => {
    // Unlock the Application so we can add new Bus Emitter handlers in the Renderer
    this.isLocked = false;

    // Re-init the active `RendererInstance`, which should effectively
    // restart the portion of the Application the User is presented.
    await options.renderer?.init();

    // Lock it back down!
    this.isLocked = true;
  };

  /**
   * Inits the Run Phase by starting Plugins by an Event, and then initializing the {@link RendererInstance | `RendererInstance`}.
   */
  private async initRunPhase(options: RendererStartedHandlerOptions) {
    // Re-init the active `RendererInstance`, which should effectively
    // restart the portion of the Application the User is presented.
    await options.renderer?.init();

    this.actors.bus.emitter.emit(CoreEvents.RendererStarted, options);

    // Lock down the system!
    this.isLocked = true;
  }
}
