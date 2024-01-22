/**
 * @typedef {import('../../../src/scripts/types.js').OverlayPlugin} OverlayPlugin
 * @typedef {import('../../../src/scripts/types.js').Managers} Managers
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} NewType
 *
 * @implements {OverlayPlugin}
 */
export default class Plugin_Default {
  name = 'Default Plugin';
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
          name: 'default',
          label: 'Default Plugin',
          inputType: 'text'
        }
      ]
    });

    console.log(`${this.name} [Settings] Initialized!`, this.managers.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log(`${this.name} Plugin [renderSettings] Initialized!`, this.managers.settingsManager.settingsSchema);
  }

  renderOverlay() {
    console.log(`${this.name} Plugin [renderOverlay] Initialized!`, this.managers.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
