import Handlebars from 'handlebars';
import {
  FormEntry,
  FormToJson,
  GenerateFormFromSchema,
  JsonToQueryString,
  PopulateFormFromJson,
  RenderTemplate
} from './util';

import schemaSettings from './schemaSettingsCore.json';

type OverlayOptions = {
  channelName?: string;
};

export default class OverlaySettings {
  options: OverlayOptions = {};

  #elemIdTemplateSettings = 'template-overlay-settings';
  #elements: Record<string, HTMLElement> = {};
  #templates: Record<string, HandlebarsTemplateDelegate<any>> = {};

  constructor(body: HTMLElement) {
    this.#elements['body'] = body;
  }

  get isConfigured() {
    return !!this.options['channelName'];
  }

  init() {
    const template = document.getElementById(this.#elemIdTemplateSettings);
    this.#templates['settings'] = Handlebars.compile(template?.innerHTML, { noEscape: true });

    this.#loadSettings();
  }

  #loadSettings() {
    const params = new URL(location.href.replaceAll('#', '')).searchParams;

    params.forEach((param, paramName) => {
      this.options[paramName as keyof OverlayOptions] = param;
    });
  }

  showSettings() {
    // Ensure no elements in the body so we can display settings
    this.#elements['body'].innerHTML = '';

    // TODO: Iterate over known plugins, and decorate the `schemaSettings` object

    RenderTemplate(this.#elements['body'], this.#templates['settings'], {
      formElements: GenerateFormFromSchema(schemaSettings as FormEntry[])
    });

    // Establish #elements now that the Settings Form has been injected into DOM
    this.#elements['form'] = this.#elements['body'].querySelector('form')!;
    this.#elements['link-results'] = this.#elements['body'].querySelector('.link-results textarea')!;
    this.#elements['load-chat'] = this.#elements['body'].querySelector('.link-results .load-chat')!;

    PopulateFormFromJson(this.#elements['form'] as HTMLFormElement, this.options);

    this.#elements['form']?.addEventListener('input', this.#onSettingsChange);
    this.#elements['load-chat']?.addEventListener('click', this.#onLoadChat);
  }

  #onSettingsChange = (event: Event) => {
    const linkResults: HTMLInputElement = this.#elements['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = this.#elements['load-chat'] as HTMLInputElement;

    const form = event.currentTarget as HTMLFormElement;
    const formData = FormToJson(form);

    const url = new URL(location.href.replaceAll('#', ''));
    const baseUrl = `${url.origin}${url.pathname}`;
    const queryString = JsonToQueryString(formData);

    this.options = formData;
    linkResults.value = `${baseUrl}?${queryString}`;
    linkButton.disabled = !form.checkValidity();

    form.reportValidity();
  };

  #onLoadChat = (_event: Event) => {
    const linkResults: HTMLInputElement = this.#elements['link-results'] as HTMLInputElement;

    window.location.href = linkResults.value;
  };
}
