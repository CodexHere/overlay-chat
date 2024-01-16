import { URI } from '../utils/URI';

import { PluginManager } from '../managers/PluginManager';
import SettingsManager from '../managers/SettingsManager';
import { BootOptions } from '../types';
import Forms from '../utils/Forms';
import { Templating } from '../utils/Templating';
import { debounce } from '../utils/misc';

const shouldReloadPlugins = ['plugins', 'customPlugins'];

export default class SettingsRenderer {
  constructor(
    private pluginMgr: PluginManager,
    private bootOptions: BootOptions,
    private settingsMgr: SettingsManager
  ) {}

  init() {
    this.renderSettings();

    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    this.pluginMgr.plugins?.forEach(plugin => plugin.renderSettings());

    this.generateUrl();
  }

  private renderSettings() {
    const elems = this.bootOptions.elements!;
    const templs = this.bootOptions.templates!;

    // Ensure no elements in the body so we can display settings
    const body = elems['body'];
    body.innerHTML = '';

    Templating.RenderTemplate(body, templs['settings'], {
      formElements: Forms.FromJson(this.settingsMgr.settingsSchema)
    });

    // Establish #elements now that the Settings Form has been injected into DOM
    const form = (elems['form'] = body.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = body.querySelector('.link-results .button-load-overlay')!);
    elems['link-results'] = body.querySelector('.link-results textarea')!;
    elems['first-details'] = body.querySelector('details')!;

    Forms.Populate(form, this.settingsMgr.settings!);

    form.addEventListener('input', debounce(this.onSettingsChanged, 500));
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);

    elems['first-details']?.setAttribute('open', '');
  }

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    const formData = Forms.GetData(form);
    this.settingsMgr.settings = formData;

    if (shouldReloadPlugins.includes(target.name)) {
      this.settingsMgr.resetSettingsSchema();
      await this.pluginMgr.loadPlugins();

      this.init();
    } else {
      form.reportValidity();
    }

    this.generateUrl();
  };

  private generateUrl() {
    const elems = this.bootOptions.elements!;
    const linkResults: HTMLInputElement = elems['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    const baseUrl = URI.BaseUrl();
    const queryString = URI.JsonToQueryString(this.settingsMgr.settings);
    linkResults.value = queryString ? `${baseUrl}?${queryString}`.replace(/\?+$/, '') : '';
    linkButton.disabled = !(elems['form'] as HTMLFormElement).checkValidity();
  }

  private onClickLoadOverlay = (_event: Event) => {
    const linkResults: HTMLInputElement = this.bootOptions.elements!['link-results'] as HTMLInputElement;
    window.location.href = linkResults.value;
  };
}
