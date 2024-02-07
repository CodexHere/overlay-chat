import { ParsedJsonResults } from '../utils/Forms.js';
import { ErrorManager, SettingsValidatorResults, TemplateMap } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

export type RenderOptions = {
  templates: TemplateMap;
  rootContainer: HTMLElement;
};

export type RendererInstanceOptions<PluginSettings extends PluginSettingsBase> = {
  renderOptions: RenderOptions;

  getParsedJsonResults?: () => ParsedJsonResults | undefined;

  validateSettings: () => SettingsValidatorResults<PluginSettings>;
  getSettings: () => PluginSettings;
  getMaskedSettings: () => PluginSettings;
  setSettings: (settings: PluginSettings) => void;
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
