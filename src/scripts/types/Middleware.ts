import { Middleware } from '../utils/Middleware.js';

export type ContextBase = {
  runningErrors: Error[];
};

export type PluginMiddlewareMap = Record<string, Middleware<ContextBase>[]>;
