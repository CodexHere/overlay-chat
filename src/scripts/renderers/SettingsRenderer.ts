import { URI } from '../utils/URI';

import OverlayBootstrapper from '../OverlayBootstrapper';
import Forms from '../utils/Forms';
import { Templating } from '../utils/Templating';
import { debounce } from '../utils/misc';

const shouldReloadPlugins = ['plugins', 'customPlugins'];

export default class SettingsRenderer {
  constructor(private bootMgr: OverlayBootstrapper) {}

  init() {
    this.renderSettings();

    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    this.bootMgr.pluginManager.plugins?.forEach(plugin => plugin.renderSettings());

    this.generateUrl();
  }

  private renderSettings() {
    const elems = this.bootMgr.bootOptions.elements!;
    const templs = this.bootMgr.bootOptions.templates!;

    // Ensure no elements in the Root so we can display settings
    const root = elems['root'];
    root.innerHTML = '';

    Templating.RenderTemplate(root, templs['settings'], {
      formElements: Forms.FromJson(this.bootMgr.settingsManager.settingsSchema)
    });

    // Establish #elements now that the Settings Form has been injected into DOM
    const form = (elems['form'] = root.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = root.querySelector('.link-results .button-load-overlay')!);
    elems['link-results'] = root.querySelector('.link-results textarea')!;
    elems['first-details'] = root.querySelector('details')!;

    Forms.Populate(form, this.bootMgr.settingsManager.settings!);

    form.addEventListener('input', debounce(this.onSettingsChanged, 500));
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);

    elems['first-details']?.setAttribute('open', '');
  }

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    const formData = Forms.GetData(form);
    this.bootMgr.settingsManager.settings = formData;

    if (shouldReloadPlugins.includes(target.name)) {
      this.bootMgr.settingsManager.resetSettingsSchema();

      try {
        await this.bootMgr.pluginManager.loadPlugins();
        this.init();
      } catch (err) {
        this.bootMgr.showError(err as Error);
      }
    } else {
      form.reportValidity();
    }

    this.generateUrl();
  };

  private generateUrl() {
    const elems = this.bootMgr.bootOptions.elements!;
    const linkResults: HTMLInputElement = elems['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    const baseUrl = URI.BaseUrl();
    const queryString = URI.JsonToQueryString(this.bootMgr.settingsManager.settings);
    linkResults.value = queryString ? `${baseUrl}?${queryString}`.replace(/\?+$/, '') : '';
    linkButton.disabled = !(elems['form'] as HTMLFormElement).checkValidity();
  }

  private onClickLoadOverlay = (_event: Event) => {
    const linkResults: HTMLInputElement = this.bootMgr.bootOptions.elements!['link-results'] as HTMLInputElement;
    window.location.href = linkResults.value;
  };
}
