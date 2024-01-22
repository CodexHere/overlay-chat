/**
 * @typedef {import('../../../src/scripts/types.js').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types.js').Managers} Managers
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} NewType
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_HangoutHere {
  name = 'Hangout Here Theme';
  managers;
  renderOptions;

  /**
   * @param {Managers} managers
   * @param {NewType} renderOptions
   */
  constructor(managers, renderOptions) {
    this.managers = managers;
    this.renderOptions = renderOptions;
  }

  loadSettingsSchema() {
    this.managers.settingsManager.addPluginSettings({
      inputType: 'fieldgroup',
      label: this.name,
      name: this.name.toLocaleLowerCase().replaceAll(' ', '_'),
      values: [
        {
          name: 'showBadges',
          label: 'Show Badges',
          inputType: 'switch',
          tooltip: 'Toggles whether to show leading Badges (i.e., Mod, VIP, etc)'
        },

        { name: 'colorLeading', label: 'Leading Color', inputType: 'color', defaultValue: '#FFFFFF' },
        { name: 'colorMod', label: 'Mod Color', inputType: 'color', defaultValue: '#00FF00' },
        { name: 'colorVip', label: 'VIP Color', inputType: 'color', defaultValue: '#FF00FF' }
      ]
    });

    console.log('HangoutHere Plugin [Settings] Initialized!', this.managers.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log('HangoutHere Plugin [renderSettings] Initialized!', this.managers.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log('HangoutHere Plugin [renderOverlay] Initialized!', this.managers.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
