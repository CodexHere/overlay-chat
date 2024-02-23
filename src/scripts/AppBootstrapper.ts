import { BusManager } from './managers/BusManager.js';
import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { TemplateIDsBase, TemplateManager } from './managers/TemplateManager.js';
import { AppRenderer } from './renderers/AppRenderer.js';
import { SettingsRenderer } from './renderers/SettingsRenderer.js';
import { AppBootstrapperOptions, DisplayManager, PluginManagerEmitter, PluginManagerEvents } from './types/Managers.js';
import { PluginImportResults, PluginSettingsBase } from './types/Plugin.js';
import { RendererConstructor, RendererInstance } from './types/Renderers.js';
import { AddStylesheet } from './utils/DOM.js';
import { RenderTemplate } from './utils/Templating.js';

export class AppBootstrapper<PluginSettings extends PluginSettingsBase> implements DisplayManager {
  busManager?: BusManager<PluginSettings>;
  settingsManager?: SettingsManager<PluginSettings>;
  pluginManager?: PluginManagerEmitter<PluginSettings>;
  templateManager?: TemplateManager;

  constructor(public bootstrapOptions: AppBootstrapperOptions<PluginSettings>) {}

  async init() {
    try {
      this.buildManagers();
      this.bindManagerEvents();
      await this.initManagers();
      await this.initRenderer();
    } catch (err) {
      this.showError(err as Error);
    }
  }

  private async buildManagers() {
    this.busManager = new BusManager();

    this.settingsManager = new SettingsManager<PluginSettings>(globalThis.location.href);

    this.templateManager = new TemplateManager();

    this.pluginManager = new PluginManager({
      defaultPlugin: this.bootstrapOptions.defaultPlugin,
      getSettings: this.settingsManager.getSettings,

      pluginRegistrar: {
        registerMiddleware: this.busManager.registerMiddleware,
        registerEvents: this.busManager.registerEvents,
        registerSettings: this.settingsManager.registerSettings,
        registerTemplates: this.templateManager.registerTemplates,
        registerStylesheet: AddStylesheet
      },

      pluginOptions: {
        emitter: this.busManager.emitter,
        getSettings: this.settingsManager.getSettings,
        getTemplates: this.templateManager.getTemplates,
        // TODO : Rename this
        errorDisplay: this
      }
    });
  }

  private async initManagers() {
    await this.settingsManager!.init();
    await this.busManager!.init();
    await this.pluginManager!.init();
    await this.templateManager!.init();
  }

  private async initRenderer() {
    const settings = this.settingsManager!.getSettings();
    const areSettingsValid = this.pluginManager!.validateSettings();

    const isConfigured = (!settings.forceShowSettings && true === areSettingsValid) || false;
    const { needsSettingsRenderer, needsAppRenderer } = this.bootstrapOptions;
    // Wants a `SettingsRenderer`, and `SettingsManager::isConfigured()` returns `false`
    const shouldRenderSettings = false === isConfigured && needsSettingsRenderer;
    // Wants an `AppRenderer`, and `SettingsManager::isConfigured()` returns `true`
    const shouldRenderApp = true === isConfigured && needsAppRenderer;

    // Select which Renderer to load...
    let rendererClass: RendererConstructor<PluginSettings> | undefined =
      shouldRenderSettings ? SettingsRenderer
      : shouldRenderApp ? AppRenderer
      : undefined;

    // Any Renderer selected and existing, init to perform Render
    if (!rendererClass) {
      return;
    }

    const renderer: RendererInstance = new rendererClass({
      getTemplates: this.templateManager!.getTemplates,
      getSettings: this.settingsManager!.getSettings,
      setSettings: this.settingsManager!.setSettings,
      getMaskedSettings: this.settingsManager!.getMaskedSettings,
      getParsedJsonResults: this.settingsManager!.getParsedJsonResults,
      getPlugins: this.pluginManager!.getPlugins,
      pluginLoader: this.pluginManager!.registerAllPlugins,
      validateSettings: this.pluginManager!.validateSettings,
      errorDisplay: this
    });

    await renderer.init();
  }

  private bindManagerEvents() {
    this.pluginManager!.addListener(
      PluginManagerEvents.LOADED,
      (importResults: PluginImportResults<PluginSettings>) => {
        this.busManager!.init();
        this.busManager!.disableAddingListeners();
        this.settingsManager!.updateParsedJsonResults(true);

        if (importResults.bad && 0 !== importResults.bad.length) {
          this.showError(importResults.bad);
        }
      }
    );

    this.pluginManager!.addListener(PluginManagerEvents.UNLOADED, () => {
      this.settingsManager!.resetSettingsSchema();
      this.busManager!.reset();
    });
  }

  showInfo = (message: string, title?: string | undefined): void => {
    const body = globalThis.document.body;
    const templates = this.templateManager?.getTemplates<TemplateIDsBase>()!;

    RenderTemplate(body, templates.modalMessage, {
      title: title ?? 'Information',
      message
    });
  };

  showError = (err: Error | Error[]) => {
    const body = globalThis.document.body;

    if (!err) {
      return;
    }

    // Convert to Array
    err = Array.isArray(err) ? err : [err];

    if (0 === err.length) {
      return;
    }

    err.forEach(console.error);

    const templates = this.templateManager?.getTemplates<TemplateIDsBase>()!;

    RenderTemplate(body, templates.modalMessage, {
      title: 'There was an Error',
      message: err.map(e => e.message).join('<br> <br>')
    });
  };
}
