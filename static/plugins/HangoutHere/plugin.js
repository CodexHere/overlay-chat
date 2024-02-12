/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} PluginSettingsBase
 * @typedef {Object} PluginSettings_Extra
 * @property {string} colorLeading
 * @property {string} colorMod
 * @property {string} colorVip
 * @typedef {PluginSettings_Extra & PluginSettingsBase} PluginSettings
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {Partial<ConcreteContext>} Context
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryGrouping} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types/Managers.js').SettingsValidatorResults<PluginSettings>} SettingsValidatorResults
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init<{}>} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Middleware.js').PluginMiddlewareMap} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginOptions<PluginSettings>} PluginInjectables
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginRegistrationOptions} PluginRegistrationOptions
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 *
 * @implements {PluginInstance}
 */
export default class Plugin_HangoutHereTheme {
  name = 'HangoutHere Theme';
  version = '1.0.0';
  ref = Symbol(this.name);

  /**
   * @param {PluginInjectables} options
   */
  constructor(options) {
    this.options = options;

    console.log(`${this.name} instantiated`);
  }

  /**
   * @returns {PluginRegistrationOptions}
   */
  registerPlugin = () => ({
    settings: this._getSettings(),
    middlewares: this._getMiddleware(),
    events: this._getEvents(),
    stylesheet: new URL(`${import.meta.url.split('/').slice(0, -1).join('/')}/plugin.css`)
  });

  /**
   * @returns {FormEntryFieldGroup}
   */
  _getSettings() {
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

  /**
   * @returns {PluginMiddlewareMap}
   */
  _getMiddleware = () => ({
    'chat:twitch': [this.middleware]
  });

  /**
   * @returns {PluginEventMap}
   */
  _getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      receives: {
        'test-event': this.testEventHandler
      }
    };
  }

  unregisterPlugin() {
    console.log(`${this.name} Unregistering`);
  }

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);
  }

  renderApp() {
    console.log(`${this.name} [renderApp]`);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
s   */
  testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middleware = async (context, next) => {
    context.message += ` [HangoutHere] `;

    await next();
  };
}
