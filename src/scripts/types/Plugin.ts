import { Listener } from 'events';
import { FormEntryGrouping } from '../utils/Forms.js';
import { BusManagerEmitter, RenderOptions, SettingsValidatorResults } from './Managers.js';
import { PluginMiddlewareMap } from './Middleware.js';

export type PluginInstances<OS extends PluginSettingsBase> = PluginInstance<OS>[];
export type PluginLoaders<OS extends PluginSettingsBase> = Array<string | PluginConstructor<OS>>;
export type PluginImportResults<OS extends PluginSettingsBase> = {
  good: PluginInstance<OS>[];
  bad: Error[];
};

export type PluginRegistrar<OS extends PluginSettingsBase> = {
  registerMiddleware(plugin: PluginInstance<OS>, queriedMiddleware: PluginMiddlewareMap | undefined): void;
  registerEvents(plugin: PluginInstance<OS>, eventMap?: PluginEventMap): void;
  registerSettings(fieldGroup?: FormEntryGrouping | undefined): void;
  registerStylesheet: (href: string) => void;
};

export type PluginSettingsBase = {
  forceShowSettings?: boolean;
  plugins?: string[];
  customPlugins?: string[];
};

export type PluginEventMap = Record<string, Listener>;

export type PluginEventRegistration = {
  receives?: PluginEventMap;
  sends?: string[];
};

export type PluginRegistrationOptions = {
  middlewares?: PluginMiddlewareMap;
  events?: PluginEventRegistration;
  settings?: FormEntryGrouping;
  stylesheet?: URL;
};

export type PluginOptions<OS extends PluginSettingsBase> = {
  getSettings: () => OS;
  emitter: Readonly<BusManagerEmitter>;
  renderOptions: RenderOptions;
};

export type PluginConstructor<OS extends PluginSettingsBase> = {
  new (options: PluginOptions<OS>): PluginInstance<OS>;
};

export type PluginInstance<OS extends PluginSettingsBase> = {
  // Injected
  options: PluginOptions<OS>;

  // Plugin should define these
  name: string;
  version: string;
  ref: Symbol;
  priority?: number;

  // Plugin can optionally define these
  registerPlugin?(): PluginRegistrationOptions | Promise<PluginRegistrationOptions>;
  unregisterPlugin?(): void;

  isConfigured?(): SettingsValidatorResults<OS>;
  renderSettings?(): void;
  renderOverlay?(): void;
};
