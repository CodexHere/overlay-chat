// First we declare our types.

export type Next<Context extends {}> = (error?: Error) => Promise<Middleware<Context>> | Promise<void>;

export type Middleware<Context extends {}> = (
  context: Context,
  next: Next<Context>,
  error?: Error
) => Promise<void> | void;

/**
 * Declare a new middleware Chain.
 */
export class MiddlewareChain<Context extends {}> {
  /**
   * @param stack A list of middlewares to add to the Chain on instantiation.
   */
  constructor(protected stack: Middleware<Context>[] = []) {}

  /**
   * Add middlewares to the Chain.
   * @param middlewares A list of middlewares to add to the current Chain.
   */
  use(...middlewares: Middleware<Context>[]) {
    this.stack.push(...middlewares);
  }

  /**
   * Execute a Chain, and move context through each middleware in turn.
   * @param context The contect object to be sent through the Chain.
   */
  async execute(ctx: Context) {
    return await this.executeMiddleware(ctx, this.stack);
  }

  private async executeMiddleware(context: Context, middlewares: Middleware<Context>[], error?: Error): Promise<void> {
    if (!middlewares.length) return;

    // If an error is detected, skip to the end and attempt to handle the error before it throws.
    const slice: Middleware<Context> = error ? middlewares[middlewares.length - 1] : middlewares[0];

    // If an error is detected, give the opportunity to continue the Chain after testing error,
    // otherwise skip to the next (and remainder of) list.
    const nextMiddlewares = error ? middlewares : middlewares.slice(1);
    const nextNext = async (error?: Error) => await this.executeMiddleware(context, nextMiddlewares, error);

    return await slice(context, nextNext, error);
  }
}
