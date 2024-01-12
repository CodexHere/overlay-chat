import { PluginManager } from './managers/PluginManager';
import SettingsManager from './managers/SettingsManager';
import { BootOptions, RendererConstructor } from './types';

export default class OverlayBootstrapper {
  private settingsManager: SettingsManager;
  private pluginManager: PluginManager;

  constructor(private bootSettings: BootOptions) {
    this.settingsManager = new bootSettings.settingsManager(globalThis.location.href);
    this.pluginManager = new PluginManager(bootSettings, this.settingsManager);
  }

  async init() {
    let rendererClass: RendererConstructor | null = null;

    await this.pluginManager.init();

    if (false === this.settingsManager?.isConfigured && this.bootSettings.settingsRenderer) {
      rendererClass = this.bootSettings.settingsRenderer;
    } else if (this.bootSettings.overlayRenderer) {
      rendererClass = this.bootSettings.overlayRenderer;
    }

    if (rendererClass) {
      new rendererClass(
        this.pluginManager,
        this.bootSettings,
        this.settingsManager,
        this.pluginManager.settingsSchema
      ).init();
    }
  }
}
