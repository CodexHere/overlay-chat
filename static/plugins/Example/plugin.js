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
export default class Plugin_Example {
  name = 'Example Plugin';
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
          name: 'exampleSettings',
          label: 'Example Plugin',
          inputType: 'text'
        }
      ]
    });
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);

    this.bus.emit('test', ['Some Test Value'], { foo: true, bar: false });
    const val = this.bus.call('test', ['Some Test Value'], { foo: true, bar: false });
    console.log('Event Output:', val);
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
