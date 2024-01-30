import { OverlaySettings, PluginInstances, RendererInstance, RendererInstanceOptions } from '../types.js';
import * as Forms from '../utils/Forms.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { GetLocalStorageItem, RemoveArrayIndex, SetLocalStorageItem, debounce } from '../utils/misc.js';

const shouldReloadPlugins = ['plugins', 'customPlugins'];
const detailsTypes = ['DETAILS:', 'SUMMARY:', 'DIV:label-wrapper'];

export class SettingsRenderer<OS extends OverlaySettings> implements RendererInstance {
  private _onSettingsChanged: (event: Event) => Promise<void>;

  constructor(private options: RendererInstanceOptions<OS>) {
    this._onSettingsChanged = debounce(this.onSettingsChanged, 500);
  }

  async init() {
    this.renderFormData();
  }

  private renderFormData() {
    const settings = this.options.settingsManager.getSettings();
    const plugins = this.options.pluginManager.getPlugins();

    this.unbindFormEvents();
    this.renderSettings(settings);
    this.renderPluginSettings(plugins);
    this.bindFormEvents();

    this.updateUrlAndResults();

    this.restoreDetailOpens();
  }

  private updateUrlAndResults() {
    const settings = this.options.settingsManager.getSettings(false);
    const url = this.generateUrl(settings);
    this.updateLinkResults(url);
  }

  private renderSettings(settings: OS) {
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

    Forms.Populate(form, settings);
  }

  private renderPluginSettings(plugins: PluginInstances<OS>) {
    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    plugins.forEach(plugin => {
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
  }

  private unbindFormEvents() {
    const elems = this.options.renderOptions.elements!;
    const root = elems['root'];
    const form = (elems['form'] = root.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = root.querySelector('.link-results .button-load-overlay')!);

    if (form) {
      form.removeEventListener('input', this._onSettingsChanged);
      form.removeEventListener('click', this.onFormClicked);
    }

    if (btnLoadOverlay) {
      btnLoadOverlay.removeEventListener('click', this.onClickLoadOverlay);
    }
  }

  private bindFormEvents() {
    const elems = this.options.renderOptions.elements!;
    const root = elems['root'];
    const form = (elems['form'] = root.querySelector('form')!);
    const btnLoadOverlay = (elems['button-load-overlay'] = root.querySelector('.link-results .button-load-overlay')!);

    elems['new-window-checkbox'] = root.querySelector('.link-results .load-option-new')!;

    form.addEventListener('input', this._onSettingsChanged);
    form.addEventListener('click', this.onFormClicked);
    btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);
  }

  private restoreDetailOpens() {
    const openDetails = GetLocalStorageItem('openDetails') as string[];

    if (!openDetails || 0 === openDetails.length) {
      // Open first one if state is missing
      this.options.renderOptions.elements?.['root'].querySelector('details')?.setAttribute('open', '');
      return;
    }

    openDetails.forEach(id => document.querySelector(`#${id}`)?.setAttribute('open', ''));
  }

  private onFormClicked = (event: MouseEvent) => {
    // A Details section might have been clicked
    if (true === event.target instanceof Element) {
      const tagAndClass = `${event.target.tagName}:${event.target.className}`;
      // User clicked a valid tag/class combo for a Details capture
      if (detailsTypes.includes(tagAndClass)) {
        const details = event.target.closest('details')!;
        const parentDetails = details.parentElement?.closest('details')!;
        const isOpening = false === details.hasAttribute('open');
        const openDetailsArray = GetLocalStorageItem('openDetails') ?? [];
        const openDetails = new Set(openDetailsArray);

        if (isOpening) {
          openDetails.add(details.id);
          openDetails.add(parentDetails.id);
        } else {
          openDetails.delete(details.id);
        }

        SetLocalStorageItem('openDetails', [...openDetails]);

        return;
      }
    }

    // A Button might have been clicked
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    const btn = event.target;
    const name = btn.name;

    if (true === name.startsWith('password-view')) {
      return this.passwordToggle(event, btn);
    } else if (true === name.startsWith('addentry') || true === name.startsWith('delentry')) {
      return this.manageArrayGroupEntries(event, btn);
    }
  };

  private manageArrayGroupEntries(event: MouseEvent, btn: HTMLButtonElement) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const isAdd = btn.name.startsWith('add');
    const content = btn.closest('.content');
    const tableBody = content?.querySelector('table tbody');

    if (!tableBody) {
      return;
    }

    if (false === isAdd) {
      const lastChild = [...tableBody.children][tableBody.children.length - 1];
      if (lastChild) {
        tableBody.removeChild(lastChild);
      }
    } else {
      const fieldgroupJSON = content?.querySelector('.arraygroup-controls')?.getAttribute('data-inputs');
      const fieldgroup = JSON.parse(fieldgroupJSON || '[]') as Forms.FormEntryGrouping[];
      const rows = content?.querySelectorAll('table tbody tr');
      let rowCount = rows?.length ?? 0;

      if (0 !== fieldgroup.length) {
        const inputs = fieldgroup.map(fe => {
          return Forms.FromJson(
            [
              {
                ...fe,
                name: `${fe.name}[${rowCount}]`
              }
            ],
            this.options.settingsManager.getSettings()
          ).results;
        });

        tableBody.insertAdjacentHTML('beforeend', `<tr><td>${inputs.join('</td><td>')}</td></tr>`);
      }
    }
  }

  private passwordToggle(event: MouseEvent, btn: HTMLButtonElement) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const name = btn.name.replace('password-view-', '');
    const input = btn.closest('div.password-wrapper')?.querySelector(`input[name="${name}"]`) as HTMLInputElement;

    if (input) {
      input.type = 'text' === input.type ? 'password' : 'text';
    }
  }

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    const formData = Forms.GetData(form);
    const targetName = RemoveArrayIndex(target.name);
    this.options.settingsManager.setSettings(formData);

    if (shouldReloadPlugins.includes(targetName)) {
      this.options.settingsManager.resetSettingsSchema();

      try {
        await this.options.pluginManager.loadPlugins();
        await this.renderFormData();
      } catch (err) {
        this.options.errorManager.showError(err as Error);
      }
    } else {
      form.reportValidity();
      this.updateUrlAndResults();
    }
  };

  private generateUrl(settings: OS) {
    const baseUrl = URI.BaseUrl();
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

    const settings = this.options.settingsManager.getSettings();
    this.options.settingsManager.toggleMaskSettings(settings, true);
    delete settings['forceShowSettings'];
    const url = this.generateUrl(settings);

    if (newWindowCheck && newWindowCheck.checked) {
      window.open(url, 'overlay');
      history.replaceState(null, '', `${url}&forceShowSettings=true`);
    } else {
      window.location.href = url;
    }
  };
}
