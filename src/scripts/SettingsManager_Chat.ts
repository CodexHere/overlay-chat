import SettingsManager from './SettingsManager';
import { OverlaySettings } from './types';

type OverlaySettings_Chat = OverlaySettings & {
  fontSize: number;
};

export class SettingsManager_Chat extends SettingsManager {
  declare settings: OverlaySettings_Chat;

  get isConfigured() {
    return !!this.settings['channelName'];
  }
}
