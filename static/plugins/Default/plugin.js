/**
 * @typedef {import('../../../src/scripts/types').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types').BootOptions} BootOptions
 * @typedef {import('../../../src/scripts/managers/SettingsManager').default} SettingsManager
 * @typedef {import('../../../src/scripts/OverlayBootstrapper').default} OverlayBootstrapper
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_Default {
  name = 'Default Plugin';
  bootManager;

  /**
   * @param {OverlayBootstrapper} bootManager
   */
  constructor(bootManager) {
    this.bootManager = bootManager;
  }

  loadSettingsSchema() {
    this.bootManager.settingsManager.addPluginSettings({
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

    console.log(`${this.name} [Settings] Initialized!`, this.bootManager.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log(`${this.name} Plugin [renderSettings] Initialized!`, this.bootManager.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log(`${this.name} Plugin [renderOverlay] Initialized!`, this.bootManager.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
