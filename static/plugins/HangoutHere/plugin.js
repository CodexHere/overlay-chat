/**
 * @typedef {import('../../../src/scripts/types.js').OverlaySettings} OS_Core
 * @typedef {Object} OS_Base
 * @property {string} colorLeading
 * @property {string} colorMod
 * @property {string} colorVip
 * @typedef {OS_Base & OS_Core} OS
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} Context
 * @typedef {import('../../../src/scripts/utils/EnhancedEventEmitter.js').EnhancedEventEmitter} EnhancedEventEmitter
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryGrouping} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types.js').ContextBase} ContextBase
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} RenderOptions
 * @typedef {import('../../../src/scripts/types.js').SettingsInjector} SettingsInjector
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance<OS>} OverlayPluginInstance
 * @typedef {import('../../../src/scripts/types.js').SettingsRetriever<OS>} SettingsRetriever
 * @typedef {import('../../../src/scripts/types.js').BusManagerEmitter} BusManagerEmitter
 *
 * @implements {OverlayPluginInstance}
 */
export default class Plugin_HangoutHereTheme {
  name = 'HangoutHere Theme';
  ref = Symbol(this.name);

  /**
   * @param {BusManagerEmitter} emitter
   * @param {SettingsRetriever} getSettings
   */
  constructor(emitter, getSettings) {
    this.emitter = emitter;
    this.getSettings = getSettings;

    console.log(`${this.name} instantiated`);

    this.emitter.addListener('test-event', this.testEventHandler);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
s   */
  testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  unregisterPlugin() {
    console.log(`${this.name} Unregistering`);
    this.emitter.removeListener('test-event', this.testEventHandler);
  }

  /**
   * @returns {FormEntryFieldGroup}
   */
  registerPluginSettings() {
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

    setTimeout(() => {
      console.log('Sending message');
      this.emitter.emit('chat:twitch--send', 'Hello from HangoutHere Theme!');
    }, 3000);
  }

  registerPluginMiddleware() {
    /** @type {?} */
    const bindMap = new Map(
      Object.entries({
        'chat:twitch': [this.middleware]
      })
    );

    return /** @type {Map<string, Middleware>} */ bindMap;
  }

  /**
   * @param {Context} context
   * @param {(error?: Error) => Promise<void>} next
   */
  middleware = async (context, next) => {
    context.message += ` [HangoutHere] `;

    await next();
  };
}
