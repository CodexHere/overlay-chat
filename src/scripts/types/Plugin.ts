import { Listener } from 'events';
import { FormEntryGrouping } from '../utils/Forms.js';
import { TemplateMap } from '../utils/Templating.js';
import { DefaultQueryString } from '../utils/URI.js';
import { BusManagerEmitter, ErrorManager, SettingsValidatorResults } from './Managers.js';
import { PluginMiddlewareMap } from './Middleware.js';

export type PluginInstances<PluginSettings extends PluginSettingsBase> = PluginInstance<PluginSettings>[];
export type PluginLoaders<PluginSettings extends PluginSettingsBase> = Array<
  string | PluginConstructor<PluginSettings>
>;
export type PluginImportResults<PluginSettings extends PluginSettingsBase> = {
  good: PluginInstance<PluginSettings>[];
  bad: Error[];
};

export type PluginRegistrar<PluginSettings extends PluginSettingsBase> = {
  registerMiddleware(plugin: PluginInstance<PluginSettings>, queriedMiddleware: PluginMiddlewareMap | undefined): void;
  registerEvents(plugin: PluginInstance<PluginSettings>, eventMap?: PluginEventMap): void;
  registerSettings(fieldGroup?: FormEntryGrouping | URL): void;
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
  settings?: FormEntryGrouping | URL;
  templates?: URL;
  stylesheet?: URL;
};

export type PluginOptions<PluginSettings extends PluginSettingsBase> = {
  getSettings: () => PluginSettings;
  emitter: Readonly<BusManagerEmitter>;
  getTemplates: () => TemplateMap;
  errorDisplay: ErrorManager;
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

  isConfigured?(): SettingsValidatorResults<PluginSettings>;
  renderSettings?(updateSettings: () => void): void;
  renderApp?(): void;
};
