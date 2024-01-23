/**
 * @typedef {import('../../../src/scripts/types.js').OverlaySettings} OS_Core
 * @typedef {Object} OS_Base
 * @property {string} exampleSettings
 * @typedef {OS_Base & OS_Core} SO
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} Context
 * @typedef {import('../../../src/scripts/utils/EnhancedEventEmitter.js').EnhancedEventEmitter} EnhancedEventEmitter
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryFieldGroup} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} RenderOptions
 * @typedef {import('../../../src/scripts/types.js').SettingsInjector} SettingsInjector
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance<Context>} OverlayPluginInstance
 * @typedef {import('../../../src/scripts/types.js').SettingsRetriever<SO>} SettingsRetriever
 * @typedef {import('@digibear/middleware').Middleware<Context>} Middleware
 * @typedef {import('@digibear/middleware').Next} Next
 *
 * @implements {OverlayPluginInstance}
 */
export default class Plugin_Example {
  name = 'Example Plugin';

  /**
   * @param {EnhancedEventEmitter} bus
   * @param {SettingsRetriever} getSettings
   */
  constructor(bus, getSettings) {
    this.bus = bus;
    this.getSettings = getSettings;

    console.log(`${this.name} instantiated`);

    this.bus.addListener('test-event', this.testEventHandler);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
   * @returns
   */
  testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  unregister() {
    console.log(`${this.name} Unregistering`);
    this.bus.removeListener('test-event', this.testEventHandler);
  }

  /**
   * @returns {FormEntryFieldGroup}
   */
  getSettingsSchema() {
    console.log(`${this.name} [injectSettingsSchema]`);

    return {
      inputType: 'fieldgroup',
      label: this.name,
      name: this.name.toLocaleLowerCase().replaceAll(' ', '_'),
      values: [
        {
          name: 'exampleSettings',
          label: 'Add Text',
          inputType: 'text',
          tooltip: 'If this value is set, it will add it to the end of the chat message!'
        }
      ]
    };
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);

    this.bus.emit('test-event', ['Some Test Value'], { foo: true, bar: false });
    const val = this.bus.call('test-event', ['Some Test Value'], { foo: true, bar: false });
    console.log('Event Output:', val);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay]`);
  }

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middleware = async (context, next) => {
    const settings = this.getSettings();

    if (settings.exampleSettings) {
      context.message += ` [${settings.exampleSettings}]`;
    }

    await next();
  };
}
