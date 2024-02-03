import { BusManager } from './managers/BusManager.js';
import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { OverlayRenderer } from './renderers/OverlayRenderer.js';
import { SettingsRenderer } from './renderers/SettingsRenderer.js';
import { BootstrapOptions, ErrorManager, PluginManagerEmitter, PluginManagerEvents } from './types/Managers.js';
import { PluginSettingsBase } from './types/Plugin.js';
import { RendererConstructor, RendererInstance } from './types/Renderers.js';
import { AddStylesheet } from './utils/misc.js';

export class OverlayBootstrapper<OS extends PluginSettingsBase> implements ErrorManager {
  busManager: BusManager<OS>;
  settingsManager: SettingsManager<OS>;
  pluginManager: PluginManagerEmitter<OS>;

  constructor(public bootstrapOptions: BootstrapOptions<OS>) {
    this.busManager = new BusManager();

    this.settingsManager = new SettingsManager<OS>(globalThis.location.href);

    this.pluginManager = new PluginManager({
      defaultPlugin: bootstrapOptions.defaultPlugin,
      getSettings: this.settingsManager.getSettings,

      pluginRegistrar: {
        registerMiddleware: this.busManager.registerMiddleware,
        registerSettings: this.settingsManager.registerSettings,
        registerStylesheet: AddStylesheet
      },
      pluginOptions: {
        emitter: this.busManager.emitter,
        getSettings: this.settingsManager.getSettings,
        renderOptions: bootstrapOptions.renderOptions
      }
    });
  }

  async init() {
    try {
      this.bindManagerEvents();
      await this.initManagers();
      await this.initRenderer();
    } catch (err) {
      this.showError(err as Error);
    }
  }

  private async initManagers() {
    await this.settingsManager.init();
    await this.busManager.init();
    await this.pluginManager.init();
  }

  private async initRenderer() {
    // Determine if `SettingsManager` is configured by way of `SettingsValidator`
    const isConfigured =
      (!this.settingsManager.getSettings().forceShowSettings && true === this.pluginManager.validateSettings()) ||
      false;
    const { needsSettingsRenderer, needsOverlayRenderer } = this.bootstrapOptions;
    // Wants a `SettingsRenderer`, and `SettingsManager::isConfigured()` returns `false`
    const shouldRenderSettings = false === isConfigured && needsSettingsRenderer;
    // Wants an `OverlayRenderer`, and `SettingsManager::isConfigured()` returns `true`
    const shouldRenderOverlay = true === isConfigured && needsOverlayRenderer;

    // Select which Renderer to load...
    let rendererClass: RendererConstructor<OS> | undefined =
      shouldRenderSettings ? SettingsRenderer
      : shouldRenderOverlay ? OverlayRenderer
      : undefined;

    // Any Renderer selected and existing, init to perform Render
    if (!rendererClass) {
      return;
    }

    const renderer: RendererInstance = new rendererClass({
      renderOptions: this.bootstrapOptions.renderOptions,
      errorDisplay: this,
      getSettings: this.settingsManager.getSettings,
      getMaskedSettings: this.settingsManager.getMaskedSettings,
      setSettings: this.settingsManager.setSettings,
      getParsedJsonResults: this.settingsManager.getParsedJsonResults,
      getPlugins: this.pluginManager.getPlugins,
      validateSettings: this.pluginManager.validateSettings,
      pluginLoader: this.pluginManager.loadPlugins
    });

    await renderer.init();
  }

  private bindManagerEvents() {
    this.pluginManager.addListener(PluginManagerEvents.LOADED, () => {
      this.settingsManager.updateParsedJsonResults();
    });

    this.pluginManager.addListener(PluginManagerEvents.UNLOADED, () => {
      this.settingsManager.resetSettingsSchema();
      this.busManager.reset();
    });
  }

  showError = (err: Error | Error[]) => {
    const root = this.bootstrapOptions.renderOptions.elements!['root']!;

    if (!err) {
      return;
    }

    // Convert to Array
    err = Array.isArray(err) ? err : [err];

    if (0 === err.length) {
      return;
    }

    err.forEach(console.error);

    root.querySelector('dialog')?.remove();

    const msg = err.map(e => e.message).join('<br> <br>');

    // TODO: Should be converted to a template!

    root.insertAdjacentHTML(
      'beforeend',
      `
        <dialog open>
        <article>
          <header>
            There was an Error
          </header>
          <p>${msg}</p>

          <footer>
            <form method="dialog">
              <button role="button">OK</button>
            </form>
          </footer>
        </article>
      </dialog>
      `
    );
  };
}
