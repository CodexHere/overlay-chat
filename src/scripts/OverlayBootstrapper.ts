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

    await this.settingsManager.init();
    await this.pluginManager.init();

    // TODO: Needs to iterate Plugins
    this.pluginManager.plugins?.loadSettings();

    // Unconfigured, and has SettingsRenderer specified
    if (false === this.settingsManager?.isConfigured && this.bootSettings.settingsRenderer) {
      rendererClass = this.bootSettings.settingsRenderer;
    } else if (this.bootSettings.overlayRenderer) {
      // Configured, and has OverlayRenderer specified
      rendererClass = this.bootSettings.overlayRenderer;
    }

    // Any Renderer selected and existing, init to perform Render
    if (rendererClass) {
      new rendererClass(this.pluginManager, this.bootSettings, this.settingsManager).init();
    }
  }
}
