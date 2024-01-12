import { OverlaySettings } from '../types';
import { URI } from '../utils/URI';

export default class SettingsManager {
  settings: OverlaySettings;

  constructor(locationHref: string) {
    this.settings = URI.QueryStringToJson(locationHref);
  }

  get isConfigured() {
    return true;
  }
}
