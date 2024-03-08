/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} PluginSettingsBase
 * @typedef {Object} PluginSettings_Extra
 * @property {string} example--addText
 * @property {boolean} example--showErrorAtRuntime
 * @property {boolean} example--showInfoAtRuntime
 * @property {string} example--showInfoAtRuntime-message
 * @property {boolean} example--sendMessageAtRuntime
 * @property {string} example--sendMessageAtRuntime-message
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
export default class Plugin_Example {
  name = 'Example - Schemas';
  version = '1.0.0';
  author = 'CodexHere <codexhere@outlook.com>';
  homepage = 'https://overlay-chat.surge.sh';
  ref = Symbol(this.name);
  priority = 20;

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
    ctx.bus.registerEvents(this, this.#getEvents());
  };

  unregister() {
    console.log(`[${this.name}] Unregistering Plugin`);
  }

  /**
   * @returns {PluginEventMap}
   */
  #getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      recieves: {
        'AppBootstrapper::RendererStarted': this.#onRendererStart
      }
    };
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
    const emitter = this.#ctx?.bus;

    if (!emitter) {
      throw new Error('Could not renderConfiguration() - no emitter???');
    }

    console.log(`[${this.name}] [renderConfiguration]`);
  }

  #renderApp() {
    const emitter = this.#ctx?.bus;

    if (!emitter) {
      throw new Error('Could not renderConfiguration() - no emitter???');
    }

    console.log(`[${this.name}] [renderApp]`);
  }
}
