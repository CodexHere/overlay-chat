import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import * as Forms from '../utils/Forms.js';
import { GetLocalStorageItem, SetLocalStorageItem } from '../utils/LocalStorage.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { RemoveArrayIndex, debounce } from '../utils/misc.js';

type ElementMap = {
  form: HTMLFormElement;
  'form-options': HTMLFormElement;
  'link-results': HTMLElement;
  'link-results-output': HTMLTextAreaElement;
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

const instanceId = new Date().getTime();

export class SettingsRenderer<PluginSettings extends PluginSettingsBase> implements RendererInstance {
  private _onSettingsChanged: (event: Event) => Promise<void>;
  private _onFormScrolled: (event: Event) => void;

  private elements: ElementMap = {} as ElementMap;
  private formOptionsCache: PluginSettings = {} as PluginSettings;

  constructor(private options: RendererInstanceOptions<PluginSettings>) {
    this._onSettingsChanged = debounce(this.onSettingsChanged, 750);
    this._onFormScrolled = debounce(this.onFormScrolled, 100);
  }

  async init() {
    const plugins = this.options.getPlugins();

    this.unbindEvents();
    this.renderApp();
    this.buildElementMap();
    this.subInit();
    this.renderPluginSettings(plugins);

    this.bindEvents();
  }

  private subInit() {
    const settings = this.options.getSettings();

    Forms.Hydrate(this.elements['form'], settings);

    this.updateUrlState();

    // Update Form Validity state data only if we're starting with settings
    // > 1, because a 'format' is enforced on the settings object
    if (Object.keys(settings).length > 1) {
      const validations = this.options.validateSettings();
      Forms.UpdateFormValidators(this.elements.form, validations);
    }

    this.createPluginJumper();

    this.restoreViewState();
  }

  private get pluginJumper() {
    return globalThis.document.getElementById('plugin-jumper') as HTMLSelectElement | undefined;
  }

  private createPluginJumper() {
    const plugins = this.options.getPlugins();
    const pluginJumper = this.pluginJumper;

    // Add the plugin name to the Plugin Jumper
    plugins.forEach(plugin => {
      const newOpt = globalThis.document.createElement('option');
      const nameAsValue = plugin.name.toLocaleLowerCase().replaceAll(' ', '_');

      newOpt.value = nameAsValue;
      newOpt.text = plugin.name;
      pluginJumper?.add(newOpt);
    });
  }

  private updateUrlState() {
    const url = this.generateUrl();
    this.updateLinkResults(url);
  }

  private renderApp() {
    const rootContainer = globalThis.document.body.querySelector('#root') as HTMLElement;
    const { settings } = this.options.getTemplates();

    if (!rootContainer) {
      return;
    }

    // Ensure no elements in the Root so we can display settings
    rootContainer.innerHTML = '';

    RenderTemplate(rootContainer, settings, {
      formElements: this.options.getParsedJsonResults?.()?.results
    });
  }

  private renderPluginSettings(plugins: PluginInstances<PluginSettings>) {
    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    plugins.forEach(plugin => {
      try {
        plugin.renderSettings?.(this._forceSyncSettings);
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderSettings\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
          );
        }
      }
    });
  }

  private _forceSyncSettings = () => {
    const form = this.elements.form;
    const formData = Forms.GetData<PluginSettings>(form);
    this.options.setSettings(formData);

    const validations = this.options.validateSettings();

    Forms.UpdateFormValidators(this.elements.form, validations);
    this.updateSettingsOptions();
    this.updateUrlState();
  };

  private buildElementMap() {
    const body = globalThis.document.body;

    const linkResults = body.querySelector<HTMLElement>('.link-results')!;

    this.elements['form'] = body.querySelector('form#settings')!;
    this.elements['form-options'] = body.querySelector('form#settings-options')!;
    this.elements['link-results'] = linkResults;
    this.elements['link-results-output'] = linkResults.querySelector('textarea')!;
  }

  private unbindEvents() {
    const form = this.elements['form'];
    const formOptions = this.elements['form-options'];
    const pluginJumper = this.pluginJumper;

    form?.removeEventListener('input', this._onSettingsChanged);
    form?.removeEventListener('click', this.onFormClicked);
    form?.removeEventListener('scroll', this._onFormScrolled);

    formOptions?.removeEventListener('click', this.onSettingsOptionClick);
    formOptions?.removeEventListener('change', this.onSettingsOptionChange);

    pluginJumper?.removeEventListener('change', this.onJumpPlugin);

    Forms.UnbindInteractionEvents(form);
  }

  private bindEvents() {
    const form = this.elements['form'];
    const formOptions = this.elements['form-options'];
    const pluginJumper = this.pluginJumper;

    form?.addEventListener('input', this._onSettingsChanged);
    form?.addEventListener('click', this.onFormClicked);
    form?.addEventListener('scroll', this._onFormScrolled);

    formOptions?.addEventListener('click', this.onSettingsOptionClick);
    formOptions?.addEventListener('change', this.onSettingsOptionChange);

    pluginJumper?.addEventListener('change', this.onJumpPlugin);

    Forms.BindInteractionEvents(form);
  }

  private restoreViewState() {
    const body = globalThis.document.body;

    // Re-open Details groups
    const openDetails = GetLocalStorageItem('openDetails') as string[];
    if (!openDetails || 0 === openDetails.length) {
      // Open first one if state is missing
      body.querySelector('details')?.setAttribute('open', '');
    } else {
      openDetails.forEach(id => document.querySelector(`#${id}`)?.setAttribute('open', ''));
    }

    // Scroll Height
    const scrollHeight = GetLocalStorageItem('scrollHeight');
    if (scrollHeight && false === isScrollTTYExpired()) {
      this.elements['form'].scrollTo({
        top: scrollHeight
      } as ScrollToOptions);
    }

    // Settings Options
    const settingsOptions: PluginSettings = GetLocalStorageItem('settingsOptions');
    if (settingsOptions) {
      Forms.Hydrate(this.elements['form-options'], settingsOptions);
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

  private onFormClicked = (event: MouseEvent) => {
    this.checkDetailsClicked(event);
  };

  private trackDetailsClicks(event: MouseEvent) {
    const target = event.target as Element;
    const details = target.closest('details')!;
    const parentDetails = details.parentElement?.closest('details')!;
    const isOpening = false === details.hasAttribute('open');
    const openDetailsArray = GetLocalStorageItem<string[]>('openDetails') ?? [];
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

  private onSettingsOptionChange = (event: Event) => {
    if (false === event.target instanceof HTMLElement) {
      return;
    }

    event.stopImmediatePropagation();
    event.preventDefault();

    const isSettingsOption = event.target.classList.contains('settings-option');

    if (!isSettingsOption) {
      return;
    }

    // Settings Option was changed

    this.updateSettingsOptions();
    this.updateUrlState();
  };

  private updateSettingsOptions() {
    // Serialize Form into JSON and store in LocalStorage
    this.formOptionsCache = Forms.GetData(this.elements['form-options']);
    SetLocalStorageItem('settingsOptions', this.formOptionsCache);
  }

  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    this.updateSettingsOptions();

    const formData = Forms.GetData<PluginSettings>(form);
    const targetName = RemoveArrayIndex(target.name);

    if (settingsShouldRetartPluginManager.includes(targetName)) {
      try {
        this.options.setSettings(formData, true);

        await this.options.pluginLoader();
        await this.init();
      } catch (err) {
        this.options.errorDisplay.showError(err as Error);
      }
    } else {
      this._forceSyncSettings();
    }
  };

  private generateUrl() {
    const settings = this.options.getMaskedSettings();

    delete settings.forceShowSettings;

    settings.format = (this.formOptionsCache.format?.[0].split(':')[1] as PluginSettings['format']) ?? settings.format;

    const baseUrl = URI.BaseUrl();
    const querystring = URI.JsonToQueryString(settings);

    return querystring ? `${baseUrl}?${querystring}`.replace(/\?+$/, '') : '';
  }

  private updateLinkResults(url: string) {
    const linkResultsOutput = this.elements['link-results-output'];
    const btnLoadApp = this.elements['form-options'].querySelector('.button-load-app') as HTMLButtonElement;

    linkResultsOutput.value = url;
    btnLoadApp.disabled = true !== this.options.validateSettings();

    linkResultsOutput.parentElement?.setAttribute('data-char-count', linkResultsOutput.value.length.toString());
  }

  private onSettingsOptionClick = (event: Event) => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    // Don't let the form reload the page
    event.stopImmediatePropagation();
    event.preventDefault();

    // Reset Button Clicked
    if (event.target.classList.contains('button-load-app')) {
      this.loadApp();
    } else if (event.target.classList.contains('button-settings-reset')) {
      localStorage.clear();
      globalThis.location.href = URI.BaseUrl();
    }
  };

  private loadApp() {
    const form = this.elements['form-options'];
    const newWindowCheck = form.querySelector('[name="new-window"]') as HTMLInputElement;

    const settings = this.options.getMaskedSettings();
    delete settings['forceShowSettings'];
    const url = this.generateUrl();

    if (newWindowCheck && newWindowCheck.checked) {
      window.open(url, `instance-${instanceId}`);
      history.replaceState(null, '', `${url}&forceShowSettings=true`);
    } else {
      window.location.href = url;
    }
  }

  private onJumpPlugin(event: Event) {
    if (false === event.target instanceof HTMLSelectElement) {
      return;
    }

    const containerId = event.target.value;
    const pluginContainer = globalThis.document.getElementById(containerId);

    pluginContainer?.setAttribute('open', '');
    pluginContainer?.scrollIntoView({
      behavior: 'smooth'
    });
  }
}
