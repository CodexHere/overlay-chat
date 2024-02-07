import { SettingsValidatorResults } from '../types/Managers.js';
import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import * as Forms from '../utils/Forms.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { GetLocalStorageItem, RemoveArrayIndex, SetLocalStorageItem, debounce } from '../utils/misc.js';

type ElementMap = {
  form: HTMLFormElement;
  'link-results': HTMLElement;
  'link-results-output': HTMLTextAreaElement;
  'button-load-app': HTMLInputElement;
};

// These settings should restart the PluginManager
const settingsShouldRetartPluginManager = ['plugins', 'customPlugins'];
const detailsTagTypes = ['DETAILS:', 'SUMMARY:', 'DIV:label-wrapper'];

const ScrollTTY = 20; // in seconds
const isScrollTTYExpired = () => {
  const lastScrolledAt = Number(GetLocalStorageItem('lastScrolledAt') || 0);
  const now = new Date().getTime();
  const elapsed = now - lastScrolledAt;

  return elapsed >= ScrollTTY * 1000;
};

export class SettingsRenderer<PluginSettings extends PluginSettingsBase> implements RendererInstance {
  private _onOverlaySettingsChanged: (event: Event) => Promise<void>;
  private _onFormScrolled: (event: Event) => void;

  private elements: ElementMap = {} as ElementMap;

  constructor(private options: RendererInstanceOptions<PluginSettings>) {
    this._onOverlaySettingsChanged = debounce(this.onOverlaySettingsChanged, 750);
    this._onFormScrolled = debounce(this.onFormScrolled, 100);
  }

  async init() {
    const plugins = this.options.getPlugins();

    this.unbindEvents();
    this.renderOverlay();
    this.renderPluginOverlay(plugins);
    this.buildElementMap();
    this.bindEvents();

    this.subInit();
  }

  private subInit() {
    const settings = this.options.getSettings();

    Forms.Hydrate(this.elements['form'], settings);

    // Update URL-based state data only if we're starting with settings
    if (Object.keys(settings).length > 0) {
      this.updateUrlState();
    }

    this.restoreViewState();
  }

  private updateUrlState() {
    const url = this.generateUrl();
    this.updateLinkResults(url);

    const validations = this.options.validateSettings();
    if (true !== validations) {
      this.updateFormValidations(validations);
    }
  }

  private renderOverlay() {
    const { rootContainer, templates } = this.options.renderOptions;

    if (!rootContainer) {
      return;
    }

    // Ensure no elements in the Root so we can display settings
    rootContainer.innerHTML = '';

    RenderTemplate(rootContainer, templates['settings'], {
      formElements: this.options.getParsedJsonResults?.()?.results
    });
  }

  private renderPluginOverlay(plugins: PluginInstances<PluginSettings>) {
    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    plugins.forEach(plugin => {
      try {
        plugin.renderSettings?.();
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderSettings\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
          );
        }
      }
    });
  }

  private buildElementMap() {
    const root = this.options.renderOptions.rootContainer;

    const linkResults = root.querySelector<HTMLElement>('.link-results')!;

    this.elements['form'] = root.querySelector('form#settings')!;
    this.elements['link-results'] = linkResults;
    this.elements['link-results-output'] = linkResults.querySelector('textarea')!;
    this.elements['button-load-app'] = linkResults.querySelector('.button-load-app')!;
  }

  private unbindEvents() {
    const form = this.elements['form'];
    const linkResults = this.elements['link-results'];
    const btnLoadOverlay = this.elements['button-load-app'];

    form?.removeEventListener('input', this._onOverlaySettingsChanged);
    form?.removeEventListener('click', this.onFormClicked);
    form?.removeEventListener('scroll', this._onFormScrolled);

    btnLoadOverlay?.removeEventListener('click', this.onClickLoadOverlay);
    linkResults?.removeEventListener('click', this.onSettingsOptionChange);
  }

  private bindEvents() {
    const form = this.elements['form'];
    const linkResults = this.elements['link-results'];
    const btnLoadOverlay = this.elements['button-load-app'];

    linkResults?.addEventListener('click', this.onSettingsOptionChange);

    if (form) {
      form.addEventListener('input', this._onOverlaySettingsChanged);
      form.addEventListener('click', this.onFormClicked);
      form.addEventListener('scroll', this._onFormScrolled);
    }

    if (btnLoadOverlay) {
      btnLoadOverlay.addEventListener('click', this.onClickLoadOverlay);
    }
  }

  private restoreViewState() {
    const root = this.options.renderOptions.rootContainer!;

    // Re-open Details groups
    const openDetails = GetLocalStorageItem('openDetails') as string[];
    if (!openDetails || 0 === openDetails.length) {
      // Open first one if state is missing
      root.querySelector('details')?.setAttribute('open', '');
    } else {
      openDetails.forEach(id => document.querySelector(`#${id}`)?.setAttribute('open', ''));
    }

    // Scroll Height
    const scrollHeight = GetLocalStorageItem('scrollHeight');
    if (scrollHeight && false === isScrollTTYExpired()) {
      this.elements['form'].scrollTo({
        top: scrollHeight
      });
    }

    // Settings Options
    const settingsOptions = GetLocalStorageItem('settingsOptions') as Record<string, any>;
    if (settingsOptions) {
      root.querySelectorAll('.settings-option').forEach(opt => {
        if (false === opt instanceof HTMLInputElement) {
          return;
        }

        const storedSetting = settingsOptions[opt.name];
        if (!storedSetting) {
          return;
        }

        // TODO: Consider other types we need to eval before checking?
        // Might figure a way to call Forms.Hydrate
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
    if (detailsTagTypes.includes(tagAndClass)) {
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

    const settings = this.options.getSettings();
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
            settings
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

    // Ensure no elements in the Root so we can display settings
    const root = this.options.renderOptions.rootContainer!;

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

    const formData = Forms.GetData<PluginSettings>(form);
    const targetName = RemoveArrayIndex(target.name);
    this.options.setSettings(formData);

    if (settingsShouldRetartPluginManager.includes(targetName)) {
      try {
        await this.options.pluginLoader();
        await this.init();
      } catch (err) {
        this.options.errorDisplay.showError(err as Error);
      }
    } else {
      form.reportValidity();
      this.updateUrlState();
    }
  };

  private generateUrl() {
    const settings = this.options.getMaskedSettings();

    delete settings.forceShowSettings;

    const baseUrl = URI.BaseUrl();
    const querystring = URI.JsonToQuerystring(settings);

    return querystring ? `${baseUrl}?${querystring}`.replace(/\?+$/, '') : '';
  }

  private updateLinkResults(url: string) {
    const linkResultsOutput = this.elements['link-results-output'];
    const linkButton = this.elements['button-load-app'];

    linkResultsOutput.value = url;
    linkButton.disabled = true !== this.options.validateSettings();
  }

  private updateFormValidations(validations: SettingsValidatorResults<PluginSettings>) {
    const root = this.options.renderOptions.rootContainer;

    // Unmark Invalid inputs
    root.querySelectorAll<HTMLInputElement>('input:invalid').forEach(elem => {
      elem?.setCustomValidity('');
    });

    Object.entries(validations).forEach(([settingName, error]) => {
      const input = root.querySelector(`[name*=${settingName}]`) as HTMLInputElement;
      input?.setCustomValidity(error);
      input?.reportValidity();
    });
  }

  private onClickLoadOverlay = (_event: Event) => {
    const newWindowCheck = this.elements['link-results'].querySelector('[name="new-window"]') as HTMLInputElement;

    const settings = this.options.getMaskedSettings();
    delete settings['forceShowSettings'];
    const url = this.generateUrl();

    if (newWindowCheck && newWindowCheck.checked) {
      window.open(url, 'overlay');
      history.replaceState(null, '', `${url}&forceShowSettings=true`);
    } else {
      window.location.href = url;
    }
  };
}
