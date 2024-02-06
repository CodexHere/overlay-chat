import { BusManagerContext_Init, BusManagerEmitter, BusManagerEvents } from '../types/Managers.js';
import { ContextBase, PluginMiddlewareMap } from '../types/Middleware.js';
import { PluginInstance, PluginSettingsBase } from '../types/Plugin.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { Middleware, MiddlewareChain } from '../utils/Middleware.js';

function isForceFailChainError(err: unknown): err is ForceFailChainError {
  if (!err || false === err instanceof Error) {
    return false;
  }

  if (err && err.cause) {
    return Object.hasOwn((err as ForceFailChainError).cause, 'forceFailChain');
  }

  return false;
}

export class ForceFailChainError extends Error {
  cause = {
    forceFailChain: true
  };

  constructor(message: string) {
    super(message);
    (Error as any).captureStackTrace(this, ForceFailChainError);
  }
}

export class BusManager<OS extends PluginSettingsBase> {
  private chainPluginMap: Map<MiddlewareChain<ContextBase>, Symbol> = new Map();
  private chains: Map<string, MiddlewareChain<ContextBase>> = new Map();
  private _emitter: BusManagerEmitter;

  get emitter(): Readonly<BusManagerEmitter> {
    return this._emitter;
  }

  constructor() {
    this._emitter = new EnhancedEventEmitter();
  }

  async init() {
    // Register "Middleware Execute" event to execute Chain
    this.emitter.on(BusManagerEvents.MIDDLEWARE_EXECUTE, this.startMiddlewareChainByName);
  }

  reset = () => {
    this.chains = new Map();
    this.chainPluginMap = new Map();
    this._emitter.removeAllListeners();
  };

  registerMiddleware = (plugin: PluginInstance<OS>, queriedMiddleware: PluginMiddlewareMap | undefined) => {
    if (!queriedMiddleware) {
      return;
    }

    for (const [middlewareName, middlwareFunction] of Object.entries(queriedMiddleware)) {
      let chosenChain = this.chains.get(middlewareName);

      // This is the first registration for the Chain
      if (!chosenChain) {
        // Create a new Chain to be chosen
        chosenChain = new MiddlewareChain();
        // Register this plugin as the leader for this Chain
        this.chainPluginMap.set(chosenChain, plugin.ref);
        // Register this Chain for the middlewareName
        this.chains.set(middlewareName, chosenChain);

        console.info(`Registering '${plugin.name}' as leader of Chain: ${middlewareName}`);
      }

      chosenChain.use(...middlwareFunction);
    }

    // Register each Middleware Chain with an Error Middleware
    for (const chain of this.chains.values()) {
      chain.use(this.errorMiddleware);
    }
  };

  private startMiddlewareChainByName = async (ctx: BusManagerContext_Init<ContextBase>) => {
    const chain = this.chains.get(ctx.chainName);

    if (!chain) {
      throw new Error('Middleware Chain does not exist: ' + ctx.chainName);
    }

    const leaderPlugin = this.chainPluginMap.get(chain);

    if (false === (ctx.initiatingPlugin.ref === leaderPlugin)) {
      throw new Error(`This Plugin did not initiate this middleware (${ctx.chainName}): ${ctx.initiatingPlugin.name}`);
    }

    try {
      console.log(`Starting Chain: ${ctx.initiatingPlugin.name}`);
      await chain.execute(ctx.initialContext);
      console.log(`Ending Chain: ${ctx.initiatingPlugin.name}`);
    } catch (err) {
      if (true === isForceFailChainError(err)) {
        console.log(`Chain Catch - Force Fail Chain: ${ctx.initiatingPlugin.name}`);
      } else {
        console.log(`Error in Chain: ${ctx.initiatingPlugin.name}`);
        throw err;
      }
    }
  };

  private errorMiddleware: Middleware<ContextBase> = async (_ctx, next, err) => {
    if (err) {
      throw err;
    } else {
      await next();
    }
  };
}
