/**
 * Middleware Chain and Link implementations for handling in-order operations
 *
 * @module
 */

/**
 * Next Function injected into each Middleware Link.
 *
 * @typeParam Context - Contextual State passed from Link to Link.
 * @param {Error} error - If supplied, the entire Chain is in Error.
 */
export type Next<Context extends {}> = (error?: Error) => Promise<MiddlewareLink<Context>> | Promise<void>;

/**
 * Middleware Link is a Handler that recieves a `<Context>`.
 * If the Middleware Link recieves an `Error`, it is expected for the Chain to fail.
 *
 * @typeParam Context - Contextual State passed from Link to Link.
 * @param {Context} context - Contextual State passed from Link to Link.
 * @param {Next} next - `Next` function to call in order to progress Chain.
 * @param {Error} error - If supplied, the entire Chain is in Error.
 */
export type MiddlewareLink<Context extends {}> = (
  context: Context,
  next: Next<Context>,
  error?: Error
) => Promise<void> | void;

/**
 * A Middleware Chain is a collection of Links that can operate on a given `Context`, which
 * gets passed from Link to Link until the entire Chain is completed.
 *
 * Generally speaking, an Error in the Chain causes the entire Chain to fail,
 * and an error returned to `next()` will in turn execute the *final* Link as an Error Handler.
 *
 * @typeParam Context - Contextual State passed from Link to Link.
 */
export class MiddlewareChain<Context extends {}> {
  /**
   * @param stack A list of Links to add to the Chain on instantiation.
   */
  constructor(protected stack: MiddlewareLink<Context>[] = []) {}

  /**
   * Add Middleware Links to the Chain.
   *
   * @param links A list of Middleware Links to add to the current Chain.
   */
  use(...links: MiddlewareLink<Context>[]) {
    this.stack.push(...links);
  }

  /**
   * Execute a Chain, and move context through each Middleware Link in turn.
   *
   * If an `Error` is injected to the function, the LAST Link is selected for execution.
   *
   * > NOTE: In this last Link, you can opt to continue the Chain by calling `next()`!
   *
   * @param context - Contextual State passed from Link to Link.
   */
  async execute(context: Context) {
    return await this.executeChain(context, this.stack);
  }

  /**
   * Perform Executing each Link of the Middleware Chain.
   *
   * As each Link is executed, the chain that is recursively injected is mutated
   * to represent the remainder of the actual chain.
   *
   * If an `Error` is injected to the function, the LAST Link is selected for execution.
   *
   * @param context - Contextual State passed from Link to Link.
   * @param links - Collection of Links remaining in the current Chain execution.
   * @param error - Possible `Error` to handle in our Link.
   */
  private async executeChain(context: Context, links: MiddlewareLink<Context>[], error?: Error): Promise<void> {
    if (!links.length) return;

    // If an error is detected, skip to the end and attempt to handle the error before it throws.
    const slice: MiddlewareLink<Context> = error ? links[links.length - 1] : links[0];

    // If an error is detected, give the opportunity to continue the Chain after testing error,
    // otherwise skip to the next (and remainder of) list.
    const nextMiddlewares = error ? links : links.slice(1);
    const nextNext = async (error?: Error) => await this.executeChain(context, nextMiddlewares, error);

    return await slice(context, nextNext, error);
  }
}
