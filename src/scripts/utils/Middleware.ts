// First we declare our types.

export type Next<Context extends {}> = (error?: Error) => Promise<Middleware<Context>> | Promise<void>;

export type Middleware<Context extends {}> = (
  context: Context,
  next: Next<Context>,
  error?: Error
) => Promise<void> | void;

/**
 * Declare a new middleware Pipeline.
 */
export class Pipeline<Context extends {}> {
  /**
   * @param stack A list of middlewares to add to the pipeline on instantiation.
   */
  constructor(protected stack: Middleware<Context>[] = []) {}

  /**
   * Add middlewares to the pipeline.
   * @param middlewares A list of middlewares to add to the current
   * pipeline.
   */
  use(...middlewares: Middleware<Context>[]) {
    this.stack.push(...middlewares);
  }

  /**
   * Execute a pipeline, and move context through each middleware in turn.
   * @param context The contect object to be sent through the pipeline.
   */
  async execute(ctx: Context) {
    return await this.executeMiddleware(ctx, this.stack);
  }

  private async executeMiddleware(context: Context, middlewares: Middleware<Context>[], error?: Error): Promise<void> {
    if (!middlewares.length) return;

    // If an error is detected, skip to the end and attempt to handle the error before it throws.
    const slice: Middleware<Context> = error ? middlewares[middlewares.length - 1] : middlewares[0];

    // If an error is detected, give the opportunity to continue the chain after testing error,
    // otherwise skip to the next (and remainder of) list.
    const nextMiddlewares = error ? middlewares : middlewares.slice(1);

    return await slice(context, async error => await this.executeMiddleware(context, nextMiddlewares, error), error);
  }
}
