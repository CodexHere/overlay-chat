import { URI } from './utils/URI';

import SettingsManager from './SettingsManager';
import schemaSettings from './schemaSettingsCore.json';
import { BootOptions, RendererInstance } from './types';
import Forms, { FormEntry } from './utils/Forms';
import { Templating } from './utils/Templating';

export default class SettingsRenderer implements RendererInstance {
  constructor(private bootOptions: BootOptions, private settingsMgr: SettingsManager) {}

  init() {
    const elems = this.bootOptions.elements!;
    const templs = this.bootOptions.templates!;

    // Ensure no elements in the body so we can display settings
    const body = elems['body'];
    body.innerHTML = '';

    // TODO: Iterate over known plugins, and decorate the `schemaSettings` object

    Templating.RenderTemplate(body, templs['settings'], {
      formElements: Forms.FromJson(schemaSettings as FormEntry[])
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

    const url = new URL(location.href.replaceAll('#', ''));
    const baseUrl = `${url.origin}${url.pathname}`;
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
