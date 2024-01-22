import SettingsManager from './managers/SettingsManager.js';
import { OverlaySettings } from './types.js';

type OverlaySettings_Chat = OverlaySettings & {
  fontSize: number;
};

export class SettingsManager_Chat extends SettingsManager {
  declare settings: OverlaySettings_Chat;

  get isConfigured() {
    return !!this.settings.channelName && !!this.settings.fontSize;
  }
}
