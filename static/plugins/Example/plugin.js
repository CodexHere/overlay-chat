/**
 * @typedef {import('../../../src/scripts/types.js').OverlaySettings} OS_Core
 * @typedef {Object} OS_Base
 * @property {string} exampleSettings
 * @typedef {OS_Base & OS_Core} SO
 *
 * @typedef {import('../../../src/scripts/managers/BusManager.js').BusError_ForceFailPipeline} BusError_ForceFailPipeline
 * @typedef {import('../../../src/scripts/types.js').ContextBase} ContextBase
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {ContextBase & Partial<ConcreteContext>} Context
 * @typedef {import('../../../src/scripts/utils/EnhancedEventEmitter.js').EnhancedEventEmitter} EnhancedEventEmitter
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryFieldGroup} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Middleware<Context>} MiddlewareContext
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Middleware<ContextBase>} MiddlewareContextBase
 * @typedef {import('../../../src/scripts/types.js').RenderOptions} RenderOptions
 * @typedef {import('../../../src/scripts/types.js').SettingsInjector} SettingsInjector
 * @typedef {import('../../../src/scripts/types.js').OverlayPluginInstance} OverlayPluginInstance
 * @typedef {import('../../../src/scripts/types.js').SettingsRetriever<SO>} SettingsRetriever
 * @typedef {import('../../../src/scripts/types.js').BusManagerEvents} BusManagerEvents
 * @typedef {import('../../../src/scripts/types.js').BusManagerEmitter} BusManagerEmitter
 * @typedef {import('../../../src/scripts/types.js').BusManagerContext_Init<ContextBase>} BusManagerContext_Init
 *
 * @implements {OverlayPluginInstance}
 */
export default class Plugin_Example {
  name = 'Example Plugin';
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
   * @returns
   */
  testEventHandler = (param1, param2) => {
    return `${this.name} TEST return call successfully (${param1.join(', ')}, ${JSON.stringify(param2)})`;
  };

  unregisterPlugin() {
    console.log(`${this.name} Unregistering`);

    // Be sure to unregister our Event Listeners, or we'll create a Memory Leak with orphaned Event Listeners
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
          name: 'exampleSettings',
          label: 'Add Text',
          inputType: 'text',
          tooltip: 'If this value is set, it will add it to the end of the chat message!'
        }
      ]
    };
  }

  registerPluginMiddleware() {
    const middleware = [
      this.middlewareSkipCurrent,
      this.middlewareSkipChain1_next,
      this.middlewareSkipChain2_error,
      this.middlewareTransient,
      this.middlewareNextError,
      this.middlewareThrowError,
      this.middlewareFinal
    ];

    // This should error, since this isn't the first plugin to register the chain pipeline
    setTimeout(() => {
      /** @type {BusManagerContext_Init} */
      const ctx = {
        chainName: 'chat:twitch',
        initialContext: { runningErrors: [] },
        initiatingPlugin: this
      };

      console.info('About to execute a middleware that this plugin did not register. Expect an error!');

      this.emitter.emit('middleware-execute', ctx);
    }, 3000);

    console.log(`Registering ${middleware.length} Middleware!`);

    /** @type {Map<string, MiddlewareContextBase>} */
    return new Map(
      Object.entries({
        // prettier-ignore
        'chat:twitch': middleware
      })
    );
  }

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareSkipCurrent = async (context, next) => {
    console.log('[Middleware 1] - Start');

    if (context.message?.includes('skipCurrent')) {
      console.log('[Middleware 1] - Skipping the rest of current Segment, move onto the next one');
      await next();
      return;
    }

    console.log('[Middleware 1] - Not skipping the current Segment, mutate and continue');

    context.message += ' [Middleware 1 Executed] ';

    const settings = this.getSettings();
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
    console.log('[Middleware 2] - Next');

    if (context.message?.includes('skipChain1')) {
      console.log('[Middleware 2] - Next - Skipping the rest of Chain');
      await next(new Error('', { cause: { forceFailPipeline: true } }));
      return;
    }

    console.log('[Middleware 2] - Next - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [Middleware 2 Executed] ';

    const settings = this.getSettings();
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
    console.log('[Middleware 3] - Error');

    if (context.message?.includes('skipChain2')) {
      console.log('[Middleware 3] - Error - [Incorrectly] Skipping the rest of Chain');
      throw new Error('', { cause: { forceFailPipeline: true } });
    }

    console.log('[Middleware 3] - Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [Middleware 3 Executed] ';

    const settings = this.getSettings();
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
    console.log('[Middleware 4] - Transient Middleware, should just zoom by!');

    context.message += ' [Middleware 4 Executed] ';

    await next();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middlewareNextError = async (context, next) => {
    console.log('[Middleware 5] - Next Error');

    if (context.message?.includes('nextError')) {
      console.log('[Middleware 5] - Next Error - Skipping the rest of Segment');
      await next(new Error('Not Skippable Error'));
      return;
    }

    console.log('[Middleware 5] - Next Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [Middleware 5] ';

    const settings = this.getSettings();
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
    console.log('[Middleware 6] - Throw Error');

    if (context.message?.includes('throwError')) {
      console.log('[Middleware 6] - Throw Error - Skipping the rest of Segment');
      throw new Error('Not Skippable Error');
    }

    console.log('[Middleware 6] - Throw Error - Not skipping the rest of Chain, mutate and continue');

    context.message += ' [Middleware 6] ';

    const settings = this.getSettings();
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
    console.log("[Middleware - FINAL] Got here if the entire Chain wasn't skipped!");

    context.message += ' [Middleware - FINAL] ';

    await next();
  };

  renderSettings() {
    console.log(`${this.name} [renderSettings]`);

    this.emitter.emit('test-event', ['Some Test Value'], { foo: true, bar: false });
    const val = this.emitter.call('test-event', ['Some Test Value'], { foo: true, bar: false });
    console.log('Event Output:', val);
  }

  renderOverlay() {
    console.log(`${this.name} [renderOverlay]`);
  }
}
