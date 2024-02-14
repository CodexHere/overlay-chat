import { TemplatesBase } from '../managers/TemplateManager.js';
import { FormValidatorResults, ParsedJsonResults } from '../utils/Forms.js';
import { TemplateMap } from '../utils/Templating.js';
import { DisplayManager } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

export type RenderOptions = {
  templates: TemplateMap<TemplatesBase>;
  rootContainer: HTMLElement;
};

export type RendererInstanceOptions<PluginSettings extends PluginSettingsBase> = {
  getParsedJsonResults?: () => ParsedJsonResults | undefined;

  validateSettings: () => FormValidatorResults<PluginSettings>;
  getMaskedSettings: () => PluginSettings;
  getUnmaskedSettings: () => PluginSettings;
  getTemplates: () => TemplateMap<TemplatesBase>;
  getSettings: () => PluginSettings;
  setSettings: (settings: PluginSettings, forceEncode?: boolean) => void;
  getPlugins: () => PluginInstances<PluginSettings>;

  pluginLoader: () => void;

  errorDisplay: DisplayManager;
};

export type RendererInstance = {
  init(): Promise<void>;
};

export type RendererConstructor<PluginSettings extends PluginSettingsBase> = {
  new (options: RendererInstanceOptions<PluginSettings>): RendererInstance;
};
