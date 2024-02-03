/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} OS_Base
 * @typedef {Object} OS_Plugin
 * @property {string} exampleSettings
 * @typedef {OS_Plugin & OS_Base} OS
 *
 * @typedef {ContextBase & Partial<ConcreteContext>} Context
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryGrouping} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init<ContextBase>} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Middleware.js').ContextBase} ContextBase
 * @typedef {import('../../../src/scripts/types/Middleware.js').PluginMiddlewareMap} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginOptions<OS>} PluginInjectables
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<OS>} PluginInstance
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginRegistrationOptions} PluginRegistrationOptions
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 *
 * @implements {PluginInstance}
 */
export default class Plugin_Example {
  name = 'Example Plugin';
  ref = Symbol(this.name);
  priority = 20;

  /**
   * @param {PluginInjectables} options
   */
  constructor(options) {
    this.options = options;

    console.log(`${this.name} instantiated`);

    this.options.emitter.addListener('test-event', this.testEventHandler);
  }

  /**
   * @returns {PluginRegistrationOptions}
   */
  getRegistrationOptions = () => ({
    settings: this._getSettings(),
    middlewarePipelines: this._getMiddleware(),
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
    // This should error, since this isn't the first plugin to register the chain pipeline
    setTimeout(() => {
      /** @type {BusManagerContext_Init} */
      const ctx = {
        chainName: 'chat:twitch',
        initialContext: { runningErrors: [] },
        initiatingPlugin: this
      };

      console.info('About to execute a middleware that this plugin did not register. Expect an error!');

      this.options.emitter.emit('middleware-execute', ctx);
    }, 3000);

    const middleware = [
      this.middlewareSkipCurrent,
      this.middlewareSkipChain1_next,
      this.middlewareSkipChain2_error,
      this.middlewareTransient,
      this.middlewareNextError,
      this.middlewareThrowError,
      this.middlewareFinal
    ];

    console.log(`Registering ${middleware.length} Middleware!`);

    return {
      // prettier-ignore
      'chat:twitch': middleware
    };
  }

  unregisterPlugin() {
    console.log(`${this.name} Unregistering`);

    // Be sure to unregister our Event Listeners, or we'll create a Memory Leak with orphaned Event Listeners
    this.options.emitter.removeListener('test-event', this.testEventHandler);
  }

  /**
   * @param {string[]} param1
   * @param {object} param2
   * @returns
   */
  testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareSkipCurrent = async (context, next) => {
    console.log('[MW 1] - Start');

    if (context.message?.includes('skipCurrent')) {
      console.log('[MW 1] - Skipping the rest of current Segment, move onto the next one');
      await next();
      return;
    }

    console.log('[MW 1] - Not skipping the current Segment, mutate and continue');

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
      await next(new Error('', { cause: { forceFailPipeline: true } }));
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
      throw new Error('', { cause: { forceFailPipeline: true } });
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
      console.log('[MW 5] - Next Error - Skipping the rest of Segment');
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
      console.log('[MW 6] - Throw Error - Skipping the rest of Segment');
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
    console.log(`${this.name} [renderSettings]`);

    this.options.emitter.emit('test-event', ['Some Test Value'], { foo: true, bar: false });
    const val = this.options.emitter.call('test-event', ['Some Test Value'], { foo: true, bar: false });
    console.log('Event Output:', val);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay]`);
  }
}
