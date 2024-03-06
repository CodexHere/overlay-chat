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
 *
 * @typedef {import('../../../src/scripts/types/Events.js').RendererStartedHandlerOptions} RendererStartHandlerOptions
 * @typedef {import('../../../src/scripts/utils/Forms/types.js').FormSchemaGrouping} FormSchemaGrouping
 * @typedef {import('../../../src/scripts/utils/Forms/types.js').FormValidatorResults<PluginSettings>} FormValidatorResults
 * @typedef {import('../../../src/scripts/types/ContextProviders.js').ContextProviders} ContextProviders
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginMiddlewareMap<Context>} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 */

const BaseUrl = () => import.meta.url.split('/').slice(0, -1).join('/');

/**
 * @implements {PluginInstance}
 */
export default class Plugin_HangoutHereTheme {
  name = 'HangoutHere Theme';
  version = '1.0.0';
  author = 'CodexHere <codexhere@outlook.com>';
  homepage = 'https://overlay-chat.surge.sh';
  ref = Symbol(this.name);

  /**
   * @type {ContextProviders | undefined}
   */
  #ctx;

  constructor() {
    console.log(`[${this.name}] instantiated`);
  }

  /**
   * @param {ContextProviders} ctx
   */
  register = async ctx => {
    await ctx.settings.register(this, new URL(`${BaseUrl()}/settings.json`));
    ctx.bus.registerMiddleware(this, this.#getMiddleware());
    ctx.bus.registerEvents(this, this.#getEvents());
    ctx.stylesheets.register(this, new URL(`${BaseUrl()}/plugin.css`));
  };

  /**
   * @returns {PluginMiddlewareMap}
   */
  #getMiddleware = () => ({
    'chat:twitch': [this.#middleware]
  });

  /**
   * @returns {PluginEventMap}
   */
  #getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      recieves: {
        'AppBootstrapper::RendererStarted': this.#onRendererStart,
        'test-event': this.#testEventHandler
      }
    };
  }

  unregister() {
    console.log(`${this.name} Unregistering`);
  }

  /**
   * Handler for when Application starts the Renderer.
   *
   * @param {RendererStartHandlerOptions} param0
   */
  #onRendererStart = ({ renderMode, ctx }) => {
    this.#ctx = ctx;

    if ('app' === renderMode) {
      this.#renderApp();
    }

    if ('configure' === renderMode) {
      this.#renderConfiguration();
    }
  };

  #renderConfiguration() {
    console.log(`${this.name} [renderConfiguration]`);

    // Just to shut up the unused `this.#ctx`
    this.#ctx?.bus.emit('bogus-event');
  }

  #renderApp() {
    console.log(`${this.name} [renderApp]`);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
s   */
  #testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  #middleware = async (context, next) => {
    context.message += ` [HangoutHere] `;

    await next();
  };
}
