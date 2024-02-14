import { Listener } from 'events';
import { FormValidatorResults } from '../utils/Forms.js';
import { TemplateMap } from '../utils/Templating.js';
import { DefaultQueryString } from '../utils/URI.js';
import { BusManagerEmitter, DisplayManager } from './Managers.js';
import { PluginMiddlewareMap } from './Middleware.js';

export type PluginInstances<PluginSettings extends PluginSettingsBase> = PluginInstance<PluginSettings>[];
export type PluginLoaders<PluginSettings extends PluginSettingsBase> = Set<string | PluginConstructor<PluginSettings>>;
export type PluginImportResults<PluginSettings extends PluginSettingsBase> = {
  good: PluginInstance<PluginSettings>[];
  bad: Error[];
};

export type PluginRegistrar<PluginSettings extends PluginSettingsBase> = {
  registerMiddleware(plugin: PluginInstance<PluginSettings>, queriedMiddleware: PluginMiddlewareMap | undefined): void;
  registerEvents(plugin: PluginInstance<PluginSettings>, eventMap?: PluginEventMap): void;
  registerSettings(plugin: PluginInstance<PluginSettings>, registration?: PluginRegistrationOptions): Promise<void>;
  registerTemplates(templateUrl?: URL): void;
  registerStylesheet: (href: string) => void;
};

export type PluginSettingsBase = DefaultQueryString & {
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
  settings?: URL;
  templates?: URL;
  stylesheet?: URL;
};

export type PluginOptions<PluginSettings extends PluginSettingsBase> = {
  getSettings: () => PluginSettings;
  emitter: Readonly<BusManagerEmitter>;
  getTemplates: <TemplateIDs extends string>() => TemplateMap<TemplateIDs>;
  errorDisplay: DisplayManager;
};

export type PluginConstructor<PluginSettings extends PluginSettingsBase> = {
  new (options: PluginOptions<PluginSettings>): PluginInstance<PluginSettings>;
};

export type PluginInstance<PluginSettings extends PluginSettingsBase> = {
  // Injected
  options: PluginOptions<PluginSettings>;

  // Plugin should define these
  name: string;
  version: string;
  ref: Symbol;
  priority?: number;

  // Plugin can optionally define these
  registerPlugin?(): PluginRegistrationOptions | Promise<PluginRegistrationOptions>;
  unregisterPlugin?(): void | Promise<void>;

  isConfigured?(): FormValidatorResults<PluginSettings>;
  renderSettings?(forceSyncSettings: () => void): void;
  renderApp?(): void;
};
