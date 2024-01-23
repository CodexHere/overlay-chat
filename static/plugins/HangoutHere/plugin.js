/**
 * @typedef {import('../../../src/scripts/utils/EnhancedEventEmitter.js').EnhancedEventEmitter} EnhancedEventEmitter
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryFieldGroup} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types.js').OverlaySettings} OverlaySettings
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} RenderOptions
 * @typedef {import('../../../src/scripts/types.js').SettingsInjector} SettingsInjector
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance<{}>} OverlayPluginInstance
 *
 * @implements {OverlayPluginInstance}
 */
export default class Plugin_HangoutHereTheme {
  name = 'Hangout Here Theme';
  priority = 99;
  bus;

  /**
   * @param {EnhancedEventEmitter} bus
   */
  constructor(bus) {
    this.bus = bus;

    console.log(`${this.name} instantiated`);

    this.bus.addListener('test', this.testEvent);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
   * @returns
   */
  testEvent = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1}, ${param2})`;
  };

  unregister() {
    console.log(`${this.name} Unregistering`);
    this.bus.removeListener('test', this.testEvent);
  }

  /**
   * @param {SettingsInjector} injector
   */
  injectSettingsSchema(injector) {
    console.log(`${this.name} [Settings]`);

    injector({
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
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay]`);
  }

  // TODO: implement this concept
  // All `object` values should be the Context as above
  /**
   *
   * @param {object} context
   * @param {(o: object) => object} next
   */
  // middleware(context, next) {}
}
