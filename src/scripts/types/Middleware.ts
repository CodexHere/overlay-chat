import { Middleware } from '../utils/Middleware.js';

export type PluginMiddlewareMap = Record<string, Middleware<{}>[]>;
