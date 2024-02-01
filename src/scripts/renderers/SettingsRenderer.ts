import { OverlaySettings, PluginInstances, RendererInstance, RendererInstanceOptions } from '../types.js';
import * as Forms from '../utils/Forms.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { GetLocalStorageItem, RemoveArrayIndex, SetLocalStorageItem, debounce } from '../utils/misc.js';

const shouldReloadPlugins = ['plugins', 'customPlugins'];
const detailsTypes = ['DETAILS:', 'SUMMARY:', 'DIV:label-wrapper'];

const ScrollTTY = 20; // in seconds
const isScrollTTYExpired = () => {
  const lastScrolledAt = Number(GetLocalStorageItem('lastScrolledAt') || 0);
  const now = new Date().getTime();
  const elapsed = now - lastScrolledAt;

  return elapsed >= ScrollTTY * 1000;
};

export class SettingsRenderer<OS extends OverlaySettings> implements RendererInstance {
  private _onOverlaySettingsChanged: (event: Event) => Promise<void>;
  private _onFormScrolled: (event: Event) => void;

  constructor(private options: RendererInstanceOptions<OS>) {
    this._onOverlaySettingsChanged = debounce(this.onOverlaySettingsChanged, 500);
    this._onFormScrolled = debounce(this.onFormScrolled, 100);
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

    this.restoreViewState();
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
    elems['link-results'] = root.querySelector('.link-results')!;
    elems['link-results-output'] = elems['link-results'].querySelector('textarea')!;

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
    const form = elems['form'];
    const linkResults = elems['link-results'];
    const btnLoadOverlay = linkResults?.querySelector('.button-load-overlay');

    if (form) {
      form.removeEventListener('input', this._onOverlaySettingsChanged);
      form.removeEventListener('click', this.onFormClicked);
      form.removeEventListener('scroll', this._onFormScrolled);
    }

    btnLoadOverlay?.removeEventListener('click', this.onClickLoadOverlay);
    linkResults?.removeEventListener('click', this.onSettingsOptionChange);
  }

  private bindFormEvents() {
    const elems = this.options.renderOptions.elements!;
    const form = elems['form'];
    const linkResults = elems['link-results'];
    const btnLoadOverlay = linkResults?.querySelector('.button-load-overlay')!;

    linkResults?.addEventListener('click', this.onSettingsOptionChange);

    if (form) {
      form.addEventListener('input', this._onOverlaySettingsChanged);
      form.addEventListener('click', this.onFormClicked);
      form.addEventListener('scroll', this._onFormScrolled);
    }

    if (btnLoadOverlay) {
      elems['button-load-overlay'] = btnLoadOverlay as HTMLElement;
      btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);
    }
  }

  private restoreViewState() {
    // Re-open Details groups
    const openDetails = GetLocalStorageItem('openDetails') as string[];
    if (!openDetails || 0 === openDetails.length) {
      // Open first one if state is missing
      this.options.renderOptions.elements?.['root'].querySelector('details')?.setAttribute('open', '');
    } else {
      openDetails.forEach(id => document.querySelector(`#${id}`)?.setAttribute('open', ''));
    }

    // Scroll Height
    const scrollHeight = GetLocalStorageItem('scrollHeight');
    if (scrollHeight && false === isScrollTTYExpired()) {
      this.options.renderOptions.elements!['form'].scrollTo({
        top: scrollHeight
      });
    }

    // Settings Options
    const settingsOptions = GetLocalStorageItem('settingsOptions') as Record<string, any>;
    if (settingsOptions) {
      this.options.renderOptions.elements!['root'].querySelectorAll('.settings-option').forEach(opt => {
        if (false === opt instanceof HTMLInputElement) {
          return;
        }

        const storedSetting = settingsOptions[opt.name];
        if (!storedSetting) {
          return;
        }

        switch (opt.type) {
          case 'checkbox':
          case 'radio':
            opt.checked = storedSetting;
            break;
          default:
            opt.value = storedSetting;
            break;
        }
      });
    }
  }

  private onFormScrolled = (event: Event) => {
    if (!event.target || false === event.target instanceof HTMLFormElement) {
      return;
    }

    // Form has scrolled
    const scrollHeight = event.target.scrollTop;
    SetLocalStorageItem('scrollHeight', scrollHeight);
    SetLocalStorageItem('lastScrolledAt', new Date().getTime());
  };

  private checkDetailsClicked = (event: MouseEvent) => {
    if (false === event.target instanceof Element) {
      return;
    }

    // A Details section might have been clicked
    const tagAndClass = `${event.target.tagName}:${event.target.className}`;

    // User clicked a valid tag/class combo for a Details capture
    if (detailsTypes.includes(tagAndClass)) {
      this.trackDetailsClicks(event);
    }
  };

  private checkButtonsClicked = (event: MouseEvent) => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    // A Button might have been clicked
    const btn = event.target;
    const name = btn.name;

    if (true === name.startsWith('password-view')) {
      return this.passwordToggle(event, btn);
    } else if (true === name.startsWith('addentry') || true === name.startsWith('delentry')) {
      return this.manageArrayGroupEntries(event, btn);
    }
  };

  private onFormClicked = (event: MouseEvent) => {
    this.checkDetailsClicked(event);
    this.checkButtonsClicked(event);
  };

  private trackDetailsClicks(event: MouseEvent) {
    const target = event.target as Element;
    const details = target.closest('details')!;
    const parentDetails = details.parentElement?.closest('details')!;
    const isOpening = false === details.hasAttribute('open');
    const openDetailsArray = GetLocalStorageItem('openDetails') ?? [];
    const openDetails = new Set(openDetailsArray);

    if (isOpening) {
      openDetails.add(details.id);
      if (parentDetails) {
        openDetails.add(parentDetails.id);
      }
    } else {
      openDetails.delete(details.id);
    }

    SetLocalStorageItem('openDetails', [...openDetails]);
  }

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

  private onSettingsOptionChange = (event: Event) => {
    if (false === event.target instanceof HTMLElement) {
      return;
    }

    const isSettingsOption = event.target.classList.contains('settings-option');

    if (!isSettingsOption) {
      return;
    }

    // Settings Option was changed

    const elems = this.options.renderOptions.elements!;

    // Ensure no elements in the Root so we can display settings
    const root = elems['root'];

    const settingsOptions: Record<string, any> = {};

    root.querySelectorAll('.settings-option').forEach(elem => {
      if (false == elem instanceof HTMLInputElement) {
        return;
      }

      const settingName = elem.name;

      switch (elem.type) {
        case 'checkbox':
          settingsOptions[settingName] = elem.checked;
          break;
        default:
          settingsOptions[settingName] = elem.value;
          break;
      }
    });

    SetLocalStorageItem('settingsOptions', settingsOptions);
  };

  private onOverlaySettingsChanged = async (event: Event) => {
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
    const linkResultsOutput: HTMLInputElement = elems['link-results-output'] as HTMLInputElement;
    const linkButton: HTMLInputElement = elems['button-load-overlay'] as HTMLInputElement;

    linkResultsOutput.value = url;
    linkButton.disabled = !this.options.settingsManager.isConfigured;
  }

  private onClickLoadOverlay = (_event: Event) => {
    const newWindowCheck = this.options.renderOptions.elements!['link-results'].querySelector(
      '[name="new-window"]'
    ) as HTMLInputElement;

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
