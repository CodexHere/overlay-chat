/**
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance} OverlayPluginInstance
 * @typedef {import('../../../src/scripts/types.js').Managers} Managers
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} NewType
 *
 * @implements {OverlayPluginInstance}
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
          name: 'default',
          label: 'Default Plugin',
          inputType: 'text'
        }
      ]
    });

    console.log(`${this.name} [Settings] Initialized!`, this.managers.settingsManager.settingsSchema);
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings] Initialized!`, this.managers.settingsManager.settingsSchema);

    this.managers.pluginManager?.bus.emit('test', ['Some Test Value'], { foo: true, bar: false });
    const val = this.managers.pluginManager?.bus.call('test', ['Some Test Value'], { foo: true, bar: false });
    console.log('FINAL:', val);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay] Initialized!`, this.managers.settingsManager.settingsSchema);
  }

  // TODO: implement this concept
  middleware(context, next) {}
}
