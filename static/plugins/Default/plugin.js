/**
 * @typedef {import('../../../src/scripts/types').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types').BootOptions} BootOptions
 * @typedef {import('../../../src/scripts/managers/SettingsManager').default} SettingsManager
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_Default {
  name = 'Default Plugin';
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

  loadSettingsSchema() {
    this.settingsManager.addPluginSettings({
      inputType: 'fieldgroup',
      label: this.name,
      name: this.name.toLocaleLowerCase().replaceAll(' ', '_'),
      values: [
        {
          name: 'default',
          label: 'Default Plugin',
          inputType: 'text'
        }
      ]
    });

    console.log(`${this.name} [Settings] Initialized!`, this.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log(`${this.name} Plugin [renderSettings] Initialized!`, this.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log(`${this.name} Plugin [renderOverlay] Initialized!`, this.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
