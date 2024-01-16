/**
 * @typedef {import('../../../src/scripts/types').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types').BootOptions} BootOptions
 * @typedef {import('../../../src/scripts/managers/SettingsManager').default} SettingsManager
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_HangoutHere {
  name = 'Hangout Here Theme';
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
          name: 'showBadges',
          label: 'Show Badges',
          inputType: 'checkbox',
          tooltip: 'Toggles whether to show leading Badges (i.e., Mod, VIP, etc)'
        },

        { name: 'colorLeading', label: 'Leading Color', inputType: 'color', defaultValue: '#FFFFFF' },
        { name: 'colorMod', label: 'Mod Color', inputType: 'color', defaultValue: '#00FF00' },
        { name: 'colorVip', label: 'VIP Color', inputType: 'color', defaultValue: '#FF00FF' }
      ]
    });

    console.log('HangoutHere Plugin [Settings] Initialized!', this.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log('HangoutHere Plugin [renderSettings] Initialized!', this.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log('HangoutHere Plugin [renderOverlay] Initialized!', this.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
