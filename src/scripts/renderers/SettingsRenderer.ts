import { OverlaySettings, RendererInstance, RendererInstanceOptions } from '../types.js';
import * as Forms from '../utils/Forms.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { debounce } from '../utils/misc.js';

const shouldReloadPlugins = ['plugins', 'customPlugins'];

export class SettingsRenderer<OS extends OverlaySettings> implements RendererInstance {
  constructor(private options: RendererInstanceOptions<OS>) {}

  async init() {
    this.renderSettings();

    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    this.options.pluginManager.getPlugins().forEach(plugin => {
      try {
        plugin.renderSettings?.(this.options.renderOptions);
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderSettings\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
          );
        }
      }
    });

    this.bindFormEvents();

    this.options.settingsManager.toggleMaskSettings(true);
    const url = this.generateUrl();
    this.updateLinkResults(url);
  }

  private renderSettings() {
    const elems = this.options.renderOptions.elements!;
    const templs = this.options.renderOptions.templates!;

    // Ensure no elements in the Root so we can display settings
    const root = elems['root'];
    root.innerHTML = '';

    RenderTemplate(root, templs['settings'], {
      formElements: this.options.settingsManager.parsedJsonResults!.results
    });

    // Establish `elements` now that the Settings Form has been injected into DOM
    const form = (elems['form'] = root.querySelector('form')!);
    elems['link-results'] = root.querySelector('.link-results textarea')!;
    elems['first-details'] = root.querySelector('details')!;

    Forms.Populate(form, this.options.settingsManager.getSettings()!);

    elems['first-details']?.setAttribute('open', '');
  }

  private bindFormEvents() {
    const elems = this.options.renderOptions.elements!;
    const root = elems['root'];
    const form = (elems['form'] = root.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = root.querySelector('.link-results .button-load-overlay')!);

    elems['new-window-checkbox'] = root.querySelector('.link-results .load-option-new')!;

    form.addEventListener('input', debounce(this.onSettingsChanged, 500));
    form.addEventListener('click', this.onFormClicked);
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);
  }

  private onFormClicked = (event: MouseEvent) => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    const btn = event.target;

    if (false === btn.name.startsWith('password-view')) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const name = btn.name.replace('password-view-', '');
    const input = btn.closest('div.password-wrapper')?.querySelector(`input[name=${name}]`) as HTMLInputElement;

    if (input) {
      input.type = 'text' === input.type ? 'password' : 'text';
    }
  };

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    const formData = Forms.GetData(form);
    this.options.settingsManager.setSettings(formData);

    if (shouldReloadPlugins.includes(target.name)) {
      this.options.settingsManager.resetSettingsSchema();

      try {
        await this.options.pluginManager.loadPlugins();
        await this.init();
      } catch (err) {
        this.options.errorManager.showError(err as Error);
      }
    } else {
      form.reportValidity();
    }

    // Masked Items are replaced with base64 encoded value to obfuscate
    this.options.settingsManager.toggleMaskSettings(true);
    const url = this.generateUrl();
    this.updateLinkResults(url);
  };

  private generateUrl(forceShowSettings = false) {
    const baseUrl = URI.BaseUrl();
    const settings = this.options.settingsManager.getSettings();

    if (forceShowSettings) {
      settings.forceShowSettings = true;
    } else {
      delete settings['forceShowSettings'];
    }

    const querystring = URI.JsonToQuerystring(settings);

    return querystring ? `${baseUrl}?${querystring}`.replace(/\?+$/, '') : '';
  }

  private updateLinkResults(url: string) {
    const elems = this.options.renderOptions.elements!;
    const linkResults: HTMLInputElement = elems['link-results'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    linkResults.value = url;
    linkButton.disabled = !this.options.settingsManager.isConfigured;
  }

  private onClickLoadOverlay = (_event: Event) => {
    const newWindowCheck = this.options.renderOptions.elements!['new-window-checkbox'] as HTMLInputElement;

    let url = this.generateUrl(false);

    if (newWindowCheck && newWindowCheck.checked) {
      window.open(url, 'overlay');
      url = this.generateUrl(true);
      history.replaceState(null, '', url);
    } else {
      window.location.href = url;
    }
  };
}
