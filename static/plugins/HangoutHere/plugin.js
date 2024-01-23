/**
 * @typedef {import('../../../src/scripts/types.js').OverlaySettings} OS_Core
 * @typedef {Object} OS_Base
 * @property {string} colorLeading
 * @property {string} colorMod
 * @property {string} colorVip
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
export default class Plugin_HangoutHereTheme {
  name = 'HangoutHere Theme';

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
s   */
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
          name: 'showBadges',
          label: 'Show Badges',
          inputType: 'switch',
          tooltip: 'Toggles whether to show leading Badges (i.e., Mod, VIP, etc)'
        },

        {
          inputType: 'fieldgroup',
          label: 'Leading Chat Colors',
          name: 'leading_chat',
          values: [
            { name: 'colorLeading', label: 'Leading Color', inputType: 'color', defaultValue: '#FFFFFF' },
            { name: 'colorMod', label: 'Mod Color', inputType: 'color', defaultValue: '#00FF00' },
            { name: 'colorVip', label: 'VIP Color', inputType: 'color', defaultValue: '#FF00FF' }
          ]
        },

        {
          inputType: 'fieldgroup',
          label: 'Text Reveal Colors',
          name: 'text_reveal_colors',
          values: [
            { name: 'hhtheme-colorRevealText2', label: 'First Color', inputType: 'color', defaultValue: '#f23373' },
            { name: 'hhtheme-colorRevealText1', label: 'Middle Color', inputType: 'color', defaultValue: '#ff8a3b' },
            { name: 'hhtheme-colorRevealText0', label: 'Final Color', inputType: 'color', defaultValue: '#e2e2e2' }
          ]
        },
        { name: 'hhtheme-colorBorder', label: 'Border Color', inputType: 'color', defaultValue: '#bc91f8' }
      ]
    };
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay]`);
  }

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middleware = async (context, next) => {
    context.message += ` [HangoutHere] colorVip=${this.getSettings().colorVip}`;

    await next();
  };
}
