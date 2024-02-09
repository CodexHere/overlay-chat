import { BusManagerContext_Init, BusManagerEmitter, BusManagerEvents } from '../types/Managers.js';
import { PluginMiddlewareMap } from '../types/Middleware.js';
import { PluginEventMap, PluginInstance, PluginSettingsBase } from '../types/Plugin.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { Middleware, MiddlewareChain } from '../utils/Middleware.js';

function isSilentlyFailChainError(err: unknown): err is SilentlyFailChainError {
  if (!err || false === err instanceof Error) {
    return false;
  }

  if (err && err.cause) {
    return Object.hasOwn((err as SilentlyFailChainError).cause, 'silentlyFailChain');
  }

  return false;
}

export class SilentlyFailChainError extends Error {
  cause = {
    silentlyFailChain: true
  };

  constructor(message: string) {
    super(message);
    (Error as any).captureStackTrace(this, SilentlyFailChainError);
  }
}

export class BusManager<PluginSettings extends PluginSettingsBase> {
  private chainPluginMap: Map<MiddlewareChain<{}>, Symbol> = new Map();
  private chains: Map<string, MiddlewareChain<{}>> = new Map();
  private _emitter: BusManagerEmitter;

  get emitter(): Readonly<BusManagerEmitter> {
    return this._emitter;
  }

  constructor() {
    this._emitter = new EnhancedEventEmitter();
  }

  init() {
    // Register "Middleware Execute" event to execute Chain
    this.emitter.on(BusManagerEvents.MIDDLEWARE_EXECUTE, this.startMiddlewareChainByName);
  }

  disableAddingListeners() {
    this._emitter.disableAddingListeners = true;
  }

  reset = () => {
    this.chains = new Map();
    this.chainPluginMap = new Map();
    this._emitter.disableAddingListeners = false;
    this._emitter.removeAllListeners();
  };

  registerMiddleware = (plugin: PluginInstance<PluginSettings>, queriedMiddleware: PluginMiddlewareMap | undefined) => {
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

  registerEvents = (plugin: PluginInstance<PluginSettings>, eventMap?: PluginEventMap) => {
    if (!eventMap) {
      return;
    }

    for (const [eventName, eventFunction] of Object.entries(eventMap)) {
      this.emitter.addListener(eventName, eventFunction.bind(plugin));
    }
  };

  private startMiddlewareChainByName = async (ctx: BusManagerContext_Init<{}>) => {
    const links = this.chains.get(ctx.chainName);

    if (!links) {
      throw new Error('Middleware Chain does not exist: ' + ctx.chainName);
    }

    const leaderPlugin = this.chainPluginMap.get(links);

    if (false === (ctx.initiatingPlugin.ref === leaderPlugin)) {
      throw new Error(`This Plugin did not initiate this middleware (${ctx.chainName}): ${ctx.initiatingPlugin.name}`);
    }

    try {
      console.log(`Starting Chain: ${ctx.chainName}`);
      await links.execute(ctx.initialContext);
      console.log(`Ending Chain: ${ctx.chainName}`);
    } catch (err) {
      if (true === isSilentlyFailChainError(err)) {
        console.log(`Chain Catch - Force Fail Chain: ${ctx.chainName}`);
      } else {
        console.log(`Error in Chain: ${ctx.chainName}`);
        throw err;
      }
    }
  };

  private errorMiddleware: Middleware<{}> = async (_ctx, next, err) => {
    if (err) {
      throw err;
    } else {
      await next();
    }
  };
}
