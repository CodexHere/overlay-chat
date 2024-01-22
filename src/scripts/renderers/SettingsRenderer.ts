import { Managers, RenderOptions, RendererInstance } from '../types.js';
import * as Forms from '../utils/Forms.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { debounce } from '../utils/misc.js';

const shouldReloadPlugins = ['plugins', 'customPlugins'];

export default class SettingsRenderer implements RendererInstance {
  constructor(private managers: Managers, private renderOptions: RenderOptions) {}

  init() {
    this.renderSettings();

    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    this.managers.pluginManager?.plugins?.forEach(plugin => plugin.renderSettings?.());

    this.generateUrl();
  }

  private renderSettings() {
    const elems = this.renderOptions.elements!;
    const templs = this.renderOptions.templates!;

    // Ensure no elements in the Root so we can display settings
    const root = elems['root'];
    root.innerHTML = '';

    RenderTemplate(root, templs['settings'], {
      formElements: Forms.FromJson(this.managers.settingsManager.settingsSchema)
    });

    // Establish #elements now that the Settings Form has been injected into DOM
    const form = (elems['form'] = root.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = root.querySelector('.link-results .button-load-overlay')!);
    elems['link-results'] = root.querySelector('.link-results textarea')!;
    elems['first-details'] = root.querySelector('details')!;

    Forms.Populate(form, this.managers.settingsManager.settings!);

    form.addEventListener('input', debounce(this.onSettingsChanged, 500));
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);

    elems['first-details']?.setAttribute('open', '');
  }

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    const formData = Forms.GetData(form);
    this.managers.settingsManager.settings = formData;

    if (shouldReloadPlugins.includes(target.name)) {
      this.managers.settingsManager.resetSettingsSchema();

      try {
        await this.managers.pluginManager?.loadPlugins();
        this.init();
      } catch (err) {
        this.managers.errorManager.showError(err as Error);
      }
    } else {
      form.reportValidity();
    }

    this.generateUrl();
  };

  private generateUrl() {
    const elems = this.renderOptions.elements!;
    const linkResults: HTMLInputElement = elems['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    const baseUrl = URI.BaseUrl();
    const queryString = URI.JsonToQueryString(this.managers.settingsManager.settings);
    linkResults.value = queryString ? `${baseUrl}?${queryString}`.replace(/\?+$/, '') : '';
    linkButton.disabled = !(elems['form'] as HTMLFormElement).checkValidity();
  }

  private onClickLoadOverlay = (_event: Event) => {
    const linkResults: HTMLInputElement = this.renderOptions.elements!['link-results'] as HTMLInputElement;
    window.location.href = linkResults.value;
  };
}
