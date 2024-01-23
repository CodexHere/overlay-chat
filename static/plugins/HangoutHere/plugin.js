/**
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance} OverlayPluginInstance
 * @typedef {import('../../../src/scripts/types.js').Managers} Managers
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} NewType
 *
 * @implements {OverlayPluginInstance}
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

    console.log(`${this.name} instantiated`);

    this.managers.pluginManager?.bus.addListener('test', this.test);
  }

  /**
   * @param {any[]} args
   */
  test = (...args) => {
    return `${this.name} TEST return call successfully`;
  };

  unregister() {
    console.log(`${this.name} Unregistering`);
    this.managers.pluginManager?.bus.removeListener('test', this.test);
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

    console.log(`${this.name} [Settings] Initialized!`);
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings] Initialized!`);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay] Initialized!`);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
