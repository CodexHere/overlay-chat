export default class Plugin_HangoutHere {
  /**
   * @param {import('../../../src/scripts/types').BootOptions} bootOptions
   * @param {import('../../../src/scripts/managers/SettingsManager')} settingsMgr
   * @param {import('../../../src/scripts/utils/Forms').FormEntry[]} settingsSchema
   */
  constructor(bootOptions, settingsMgr, settingsSchema) {
    this.bootOptions = bootOptions;
    this.settingsMgr = settingsMgr;
    this.settingsSchema = settingsSchema;
  }

  init_settings() {
    debugger;
    this.settingsSchema.splice(
      this.settingsSchema.length,
      0,
      /// New Items!
      {
        name: 'showBadges',
        label: 'Show Badges',
        inputType: 'checkbox',
        tooltip: 'Toggles whether to show leading Badges (i.e., Mod, VIP, etc)'
      },

      { name: 'colorLeading', label: 'Leading Color', inputType: 'color', defaultValue: '#FFFFFF' },
      { name: 'colorMod', label: 'Mod Color', inputType: 'color', defaultValue: '#00FF00' },
      { name: 'colorVip', label: 'VIP Color', inputType: 'color', defaultValue: '#FF00FF' }
    );

    console.log('HangoutHere Plugin [Settings] Initialized!', this.settingsSchema);
  }

  // TODO: Split into a Overlay vs Settings renderer...
  // TODO: Assumption - Settings are technically only loaded when the SettingsRenderer is instantiated. It needs to be done well before this, so the plugin on OverlayRenderer has access to the full suite of settings.
  init_renderer() {
    console.log('HangoutHere Plugin [Renderer] Initialized!', this.settingsSchema);
  }
}
