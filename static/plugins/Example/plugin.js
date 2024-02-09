/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} PluginSettingsBase
 * @typedef {Object} PluginSettings_Extra
 * @property {string} exampleSettings
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
export default class Plugin_Example {
  name = 'Example Plugin';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = 20;

  /**
   * @param {PluginInjectables} options
   */
  constructor(options) {
    this.options = options;

    console.log(`[${this.name}] instantiated`);
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
    console.log(`[${this.name}] [_getSettings]`);

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

  /**
   * @returns {PluginMiddlewareMap}
   */
  _getMiddleware() {
    const middleware = [
      this.middlewareSkipCurrent,
      this.middlewareSkipChain1_next,
      this.middlewareSkipChain2_error,
      this.middlewareTransient,
      this.middlewareNextError,
      this.middlewareThrowError,
      this.middlewareFinal
    ];

    console.log(`[${this.name}] Registering ${middleware.length} Middleware!`);

    return {
      // prettier-ignore
      'chat:twitch': middleware
    };
  }

  /**
   * @returns {PluginEventMap}
   */
  _getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      receives: {
        'test-event': this.testEventHandler
      },
      sends: ['test-event', 'middleware-execute']
    };
  }

  unregisterPlugin() {
    console.log(`[${this.name}] Unregistering Plugin`);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
   * @returns
   */
  testEventHandler = (param1, param2) => {
    return `[${this.name}] TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareSkipCurrent = async (context, next) => {
    console.log('[MW 1] - Start');

    if (context.message?.includes('skipCurrent')) {
      console.log('[MW 1] - Skipping the rest of current Link, move onto the next one');
      await next();
      return;
    }

    console.log('[MW 1] - Not skipping the current Link, mutate and continue');

    context.message += ' [MW 1 Exec] ';

    const settings = this.options.getSettings();
    if (settings.exampleSettings) {
      context.message += `[${settings.exampleSettings}] `;
    }

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareSkipChain1_next = async (context, next) => {
    console.log('[MW 2] - Next');

    if (context.message?.includes('skipChain1')) {
      console.log('[MW 2] - Next - Skipping the rest of Chain');
      await next(new Error('', { cause: { silentlyFailChain: true } }));
      return;
    }

    console.log('[MW 2] - Next - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [MW 2 Exec] ';

    const settings = this.options.getSettings();
    if (settings.exampleSettings) {
      context.message += `[${settings.exampleSettings}] `;
    }

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareSkipChain2_error = async (context, next) => {
    console.log('[MW 3] - Error');

    if (context.message?.includes('skipChain2')) {
      console.log('[MW 3] - Error - [Incorrectly] Skipping the rest of Chain');
      throw new Error('', { cause: { silentlyFailChain: true } });
    }

    console.log('[MW 3] - Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [MW 3 Exec] ';

    const settings = this.options.getSettings();
    if (settings.exampleSettings) {
      context.message += `[${settings.exampleSettings}] `;
    }

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareTransient = async (context, next) => {
    console.log('[MW 4] - Transient Middleware, should just zoom by!');

    context.message += ' [MW 4 Exec] ';

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareNextError = async (context, next) => {
    console.log('[MW 5] - Next Error');

    if (context.message?.includes('nextError')) {
      console.log('[MW 5] - Next Error - Skipping the rest of Link');
      await next(new Error('Not Skippable Error'));
      return;
    }

    console.log('[MW 5] - Next Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [MW 5] ';

    const settings = this.options.getSettings();
    if (settings.exampleSettings) {
      context.message += `[${settings.exampleSettings}] `;
    }

    await next();
  };
  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareThrowError = async (context, next) => {
    console.log('[MW 6] - Throw Error');

    if (context.message?.includes('throwError')) {
      console.log('[MW 6] - Throw Error - Skipping the rest of Link');
      throw new Error('Not Skippable Error');
    }

    console.log('[MW 6] - Throw Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [MW 6] ';

    const settings = this.options.getSettings();
    if (settings.exampleSettings) {
      context.message += `[${settings.exampleSettings}] `;
    }

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareFinal = async (context, next) => {
    console.log("[MW - FINAL] Got here if the entire Chain wasn't skipped!");

    context.message += ' [MW - FINAL] ';

    await next();
  };

  renderSettings() {
    console.log(`[${this.name}] [renderSettings]`);

    this.options.emitter.emit('test-event', ['Some Test Value'], { foo: true, bar: false });
    const val = this.options.emitter.call('test-event', ['Some Test Value'], { foo: true, bar: false });
    console.log(`[${this.name}] Event Output:`, val);

    // This should error, since this isn't the first plugin to register the chain
    setTimeout(() => {
      /** @type {BusManagerContext_Init} */
      const ctx = {
        chainName: 'chat:twitch',
        initialContext: {},
        initiatingPlugin: this
      };

      // Fails because we didn't initially register this middleware chain
      console.warn(`[${this.name}] About to execute a middleware that this plugin did not register. Expect an error!`);
      this.options.emitter.emit('middleware-execute', ctx);

      // Fails because the emitter is locked down after plugins are registered
      console.warn(`[${this.name}] Attempting to register a new event on the eventbus, this should fail with an error`);
      try {
        this.options.emitter.addListener('thisShouldFail', () => {});
      } catch (err) {
        console.warn('Swallowing error, but showing, for example only!');
        console.error(err);
      }

      // Shows an error to the user as an example
      console.warn(`[${this.name}] Show an error to the user`);
      this.options.errorDisplay.showError(new Error('This error should be shown to the user!'));
    }, 3000);
  }

  renderApp() {
    console.log(`[${this.name}] [renderApp]`);
  }
}
