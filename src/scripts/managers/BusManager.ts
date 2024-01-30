import {
  BusManagerContext_Init,
  BusManagerEmitter,
  BusManagerEvents,
  ContextBase,
  OverlaySettings,
  PluginInstances
} from '../types.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { Middleware, Pipeline } from '../utils/Middleware.js';

function isForceFailPipelineError(err: unknown): err is BusError_ForceFailPipeline {
  if (!err || false === err instanceof Error) {
    return false;
  }

  if (err && err.cause) {
    return Object.hasOwn((err as BusError_ForceFailPipeline).cause, 'forceFailPipeline');
  }

  return false;
}

export class BusError_ForceFailPipeline extends Error {
  cause = {
    forceFailPipeline: true
  };

  constructor(message: string) {
    super(message);
    (Error as any).captureStackTrace(this, BusError_ForceFailPipeline);
  }
}

export class BusManager<OS extends OverlaySettings> {
  private pipelineRegistrations: Map<Pipeline<ContextBase>, Symbol> = new Map();
  private pipelines: Map<string, Pipeline<ContextBase>> = new Map();
  private _events: BusManagerEmitter;

  get events(): Readonly<BusManagerEmitter> {
    return this._events;
  }

  constructor() {
    this._events = new EnhancedEventEmitter();
  }

  async init() {
    // Register "Middleware Execute" event to execute pipeline
    this.events.on(BusManagerEvents.MIDDLEWARE_EXECUTE, this.startMiddlewareChainByName);
  }

  clearPluginRegistrations() {
    this.pipelines = new Map();
    this.pipelineRegistrations = new Map();
    this._events.removeAllListeners();
  }

  registerPluginMiddleware(plugins: PluginInstances<OS>) {
    // Register each plugin (in assumed Priority-sort order) for their desired Middleware Chains
    for (const plugin of plugins) {
      if (!plugin.registerPluginMiddleware) {
        continue;
      }

      const queriedMiddleware = plugin.registerPluginMiddleware();

      for (const [middlewareName, middlwareFunction] of queriedMiddleware.entries()) {
        let chosenPipeline = this.pipelines.get(middlewareName);

        // This is the first registration for the pipeline
        if (!chosenPipeline) {
          // Create a new pipeline to be chosen
          chosenPipeline = new Pipeline();
          // Register this plugin as the leader for this pipeline
          this.pipelineRegistrations.set(chosenPipeline, plugin.ref);
          // Register this pipeline for the middlewareName
          this.pipelines.set(middlewareName, chosenPipeline);

          console.info(`Registering '${plugin.name}' as leader of chain: ${middlewareName}`);
        }

        chosenPipeline.use(...middlwareFunction);
      }
    }

    // Register each Middleware Chain with an Error Middleware
    for (const pipeline of this.pipelines.values()) {
      pipeline.use(this.errorMiddleware);
    }
  }

  private startMiddlewareChainByName = async (ctx: BusManagerContext_Init<ContextBase>) => {
    const pipeline = this.pipelines.get(ctx.chainName);

    if (!pipeline) {
      throw new Error('Middleware Chain does not exist: ' + ctx.chainName);
    }

    const leaderPlugin = this.pipelineRegistrations.get(pipeline);

    if (false === (ctx.initiatingPlugin.ref === leaderPlugin)) {
      throw new Error(`This Plugin did not initiate this middleware (${ctx.chainName}): ${ctx.initiatingPlugin.name}`);
    }

    try {
      console.log(`Starting Chain: ${ctx.initiatingPlugin.name}`);

      await pipeline.execute(ctx.initialContext);

      console.log(`Ending Chain: ${ctx.initiatingPlugin.name}`);
    } catch (err) {
      if (true === isForceFailPipelineError(err)) {
        console.log(`Chain Catch -- Force Fail Chain: ${ctx.initiatingPlugin.name}`);
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
      next();
    }
  };
}
