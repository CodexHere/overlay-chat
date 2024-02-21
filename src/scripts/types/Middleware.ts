import { MiddlewareLink } from '../utils/Middleware.js';

export type PluginMiddlewareMap = Record<string, MiddlewareLink<{}>[]>;
