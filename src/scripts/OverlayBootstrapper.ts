import SettingsManager from './SettingsManager';
import { BootOptions, RendererConstructor } from './types';

export default class OverlayBootstrapper {
  private settingsManager: SettingsManager;

  constructor(private bootSettings: BootOptions) {
    this.settingsManager = new bootSettings.settingsManager(globalThis.location.href);
  }

  init() {
    let rendererClass: RendererConstructor | null = null;

    if (false === this.settingsManager?.isConfigured && this.bootSettings.settingsRenderer) {
      rendererClass = this.bootSettings.settingsRenderer;
    } else if (this.bootSettings.overlayRenderer) {
      rendererClass = this.bootSettings.overlayRenderer;
    }

    if (rendererClass) {
      new rendererClass(this.bootSettings, this.settingsManager).init();
    }
  }
}
