import { URI } from '../utils/URI';

import SettingsManager from '../managers/SettingsManager';
import { BootOptions, RendererInstance } from '../types';
import Forms, { FormEntry } from '../utils/Forms';
import { Templating } from '../utils/Templating';
import { PluginManager } from '../managers/PluginManager';

export default class SettingsRenderer implements RendererInstance {
  constructor(
    private pluginMgr: PluginManager,
    private bootOptions: BootOptions,
    private settingsMgr: SettingsManager,
    private schemaSettings?: FormEntry[]
  ) {}

  init() {
    const elems = this.bootOptions.elements!;
    const templs = this.bootOptions.templates!;

    // Ensure no elements in the body so we can display settings
    const body = elems['body'];
    body.innerHTML = '';

    this.pluginMgr.plugin?.init_settings();

    Templating.RenderTemplate(body, templs['settings'], {
      formElements: Forms.FromJson(this.schemaSettings!)
    });

    // Establish #elements now that the Settings Form has been injected into DOM
    const form = (elems['form'] = body.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = body.querySelector('.link-results .button-load-overlay')!);
    elems['link-results'] = body.querySelector('.link-results textarea')!;

    Forms.Populate(form, this.settingsMgr.settings!);

    form.addEventListener('input', this.onSettingsChange);
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);
  }

  private onSettingsChange = (event: Event) => {
    const elems = this.bootOptions.elements!;

    const linkResults: HTMLInputElement = elems['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    const form = event.currentTarget as HTMLFormElement;
    const formData = Forms.GetData(form);

    const baseUrl = URI.BaseUrl();
    const queryString = URI.JsonToQueryString(formData);

    this.settingsMgr.settings = formData;
    linkResults.value = `${baseUrl}?${queryString}`;
    linkButton.disabled = !form.checkValidity();

    form.reportValidity();
  };

  private onClickLoadOverlay = (_event: Event) => {
    const linkResults: HTMLInputElement = this.bootOptions.elements!['link-results'] as HTMLInputElement;
    window.location.href = linkResults.value;
  };
}
