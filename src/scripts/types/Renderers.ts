import { ParsedJsonResults } from '../utils/Forms.js';
import { ErrorManager, RenderOptions, SettingsValidatorResults } from './Managers.js';
import { PluginInstances, PluginSettingsBase } from './Plugin.js';

export type RendererInstanceOptions<OS extends PluginSettingsBase> = {
  // busManager: BusManager<OS>;
  // pluginManager: PluginManager<OS>;
  // settingsManager: SettingsManager<OS>;

  renderOptions: RenderOptions;

  getParsedJsonResults?: () => ParsedJsonResults | undefined;

  validateSettings: () => SettingsValidatorResults<OS>;
  getSettings: () => OS;
  getMaskedSettings: () => OS;
  setSettings: (settings: OS) => void;
  getPlugins: () => PluginInstances<OS>;

  pluginLoader: () => void;

  errorDisplay: ErrorManager;
};

export type RendererInstance = {
  init(): Promise<void>;
};

export type RendererConstructor<OS extends PluginSettingsBase> = {
  new (options: RendererInstanceOptions<OS>): RendererInstance;
};
