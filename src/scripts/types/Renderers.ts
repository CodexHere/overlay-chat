import { ParsedJsonResults } from '../utils/Forms.js';
import { TemplateMap } from '../utils/Templating.js';
import { ErrorManager, SettingsValidatorResults } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

export type RenderOptions = {
  templates: TemplateMap;
  rootContainer: HTMLElement;
};

export type RendererInstanceOptions<PluginSettings extends PluginSettingsBase> = {
  getParsedJsonResults?: () => ParsedJsonResults | undefined;

  validateSettings: () => SettingsValidatorResults<PluginSettings>;
  getMaskedSettings: () => PluginSettings;
  getUnmaskedSettings: () => PluginSettings;
  getTemplates: () => TemplateMap;
  getSettings: () => PluginSettings;
  setSettings: (settings: PluginSettings, forceEncode?: boolean) => void;
  getPlugins: () => PluginInstances<PluginSettings>;

  pluginLoader: () => void;

  errorDisplay: ErrorManager;
};

export type RendererInstance = {
  init(): Promise<void>;
};

export type RendererConstructor<PluginSettings extends PluginSettingsBase> = {
  new (options: RendererInstanceOptions<PluginSettings>): RendererInstance;
};
