import SettingsManager from '../../../src/scripts/managers/SettingsManager';

/**
 * @typedef {import('../../../src/scripts/types').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types').BootOptions} BootOptions
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_Default {
  bootOptions;
  settingsManager;

  /**
   * @param {BootOptions} bootOptions
   * @param {SettingsManager} settingsMgr
   */
  constructor(bootOptions, settingsMgr) {
    this.bootOptions = bootOptions;
    this.settingsManager = settingsMgr;
  }

  loadSettings() {
    this.settingsManager.settingsSchema.splice(
      this.settingsManager.settingsSchema.length,
      0,
      /// New Items!
      {
        name: 'default',
        label: 'Default Plugin',
        inputType: 'text'
      }
    );

    console.log('Default [Settings] Initialized!', this.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log('Default Plugin [renderSettings] Initialized!', this.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log('Default Plugin [renderOverlay] Initialized!', this.settingsManager.settingsSchema);
  }
}
