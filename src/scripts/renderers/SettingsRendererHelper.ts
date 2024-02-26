/**
 * Helper Behaviors for better UX within the `SettingsRenderer`
 *
 * @module
 */
import { PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstanceOptions } from '../types/Renderers.js';
import { Deserialize, Serialize } from '../utils/Forms/Serializer.js';
import { GetLocalStorageItem, SetLocalStorageItem } from '../utils/LocalStorage.js';
import { BaseUrl, JsonToQueryString } from '../utils/URI.js';
import { DebounceResult, debounce } from '../utils/misc.js';

/**
 * Elements we know about in this {@link RendererInstance | `RendererInstance`} Helper.
 */
type ElementMap = {
  form: HTMLFormElement;
  'form-options': HTMLFormElement;
  'link-results-area': HTMLElement;
  'link-results-output': HTMLTextAreaElement;
};

// How many ms it takes to reveal the URL Area
const URL_REVEAL_TTY = 2 * 1000;
// Unique ID created on load of this file. This is a re-use/busting ID for the "New Window" feature.
const instanceId = new Date().getTime();
// After this TTY, no longer "resume" scroll value
const ScrollTTY = 20; // in seconds
// Helper to evaluate whether the ScrolTTY has Expired
const isScrollTTYExpired = () => {
  const lastScrolledAt = Number(GetLocalStorageItem('lastScrolledAt') || 0);
  const now = new Date().getTime();
  const elapsed = now - lastScrolledAt;

  return elapsed >= ScrollTTY * 1000;
};

/**
 * Helper Behaviors for better UX within the `SettingsRenderer`.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class SettingsRendererHelper<PluginSettings extends PluginSettingsBase> {
  /** Debounced Handler for when the URL Text is Moused. */
  private onUrlMouseEnterDebouncer: DebounceResult;
  /** Local `ElementMap` mapping name -> Element the {@link RendererInstance | `RendererInstance`} Helper needs to access. */
  private elements: ElementMap = {} as ElementMap;
  /** Local Deserialized instance of the Settings Options Form data. */
  private settingsOptionsFormCache: PluginSettings = {} as PluginSettings;

  /**
   * Create a new {@link SettingsRenderer | `SettingsRenderer`}.
   *
   * @param options - Incoming Options for this Renderer.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private options: RendererInstanceOptions<PluginSettings>) {
    this.onUrlMouseEnterDebouncer = debounce(this.onUrlMousePresence, URL_REVEAL_TTY);
  }

  /**
   * Initialize the Renderer, kicking off the Lifecycle.
   */
  init() {
    this.unbindEvents();
    this.buildElementMap();
    this.subInit();
    this.bindEvents();
  }

  /**
   * Build the Local `ElementMap` this {@link RendererInstance | `RendererInstance`} Helper needs to access.
   */
  private buildElementMap() {
    const body = globalThis.document.body;

    const formOptions = body.querySelector('form#settings-options')!;
    this.elements['form'] = body.querySelector('form#settings')!;
    this.elements['form-options'] = body.querySelector('form#settings-options')!;
    this.elements['link-results-area'] = formOptions.querySelector('.textarea-wrapper')!;
    this.elements['link-results-output'] = formOptions.querySelector('textarea.url')!;
  }

  /**
   * Custom Initialization for this Renderer that doesn't fit into other Lifecycle methods.
   */
  private subInit() {
    const settings = this.options.getSettings();

    this.restoreViewState(settings);
  }

  /**
   * Unbind/Remove Events we may be listening to, in order to avoid an Event Leak.
   */
  private unbindEvents() {
    const formOptions = this.elements['form-options'];
    formOptions?.removeEventListener('click', this.onSettingsOptionClick);
    formOptions?.removeEventListener('change', this.onSettingsOptionChange);

    const resultsArea = this.elements['link-results-area'];
    resultsArea?.removeEventListener('click', this.onUrlClick);
    resultsArea?.removeEventListener('mouseenter', this.onUrlMouseEnterDebouncer.handler);
    resultsArea?.removeEventListener('mouseleave', this.onUrlMousePresence);
  }

  /**
   * Bind/Add Events we need to listen to for UX, Settings Validation, etc.
   */
  private bindEvents() {
    const formOptions = this.elements['form-options'];
    formOptions?.addEventListener('click', this.onSettingsOptionClick);
    formOptions?.addEventListener('change', this.onSettingsOptionChange);

    const resultsArea = this.elements['link-results-area'];
    // Clipboard is disabled for some reason, gracefully degrade...
    if (!globalThis.navigator.clipboard) {
      resultsArea.classList.add('reveal');
      resultsArea.querySelector('.results-reveal')?.remove();
    } else {
      resultsArea?.addEventListener('click', this.onUrlClick);
      resultsArea?.addEventListener('mouseenter', this.onUrlMouseEnterDebouncer.handler);
      resultsArea?.addEventListener('mouseleave', this.onUrlMousePresence);
    }
  }

  /**
   * Restore the View State based on previously stored values.
   *
   * This is called somewhat frequently because we often destroy and rebuild the entire Renderer View.
   * Because of this, this method is called to quickly put the View State back to what it was to appear
   * as if nothing happened in the UI.
   */
  private restoreViewState(settings: PluginSettings) {
    const body = globalThis.document.body;

    // Re-open Details groups based on previously opened states saved in Local Storage.
    const openDetails = GetLocalStorageItem('openDetails') as string[];
    if (!openDetails || 0 === openDetails.length) {
      // Open first one if state is missing
      body.querySelector('details')?.setAttribute('open', '');
    } else {
      openDetails.forEach(id => document.querySelector(`#${id}`)?.setAttribute('open', ''));
    }

    // Scroll to `settingsFormTop` saved before in Local Storage.
    const settingsFormTop = GetLocalStorageItem('settingsFormTop');
    if (settingsFormTop && false === isScrollTTYExpired()) {
      this.elements['form'].scrollTo({
        top: settingsFormTop
      } as ScrollToOptions);
    }

    // Restore the Settings Options Form data from stringified data in Local Storage.
    const settingsOptions: PluginSettings = GetLocalStorageItem('settingsOptions');
    if (settingsOptions) {
      Deserialize(this.elements['form-options'], settingsOptions);

      // Set the Format option to the incoming Settings value
      const formatElem = this.elements['form-options'].querySelector('[name="format"]');
      if (formatElem instanceof HTMLSelectElement) {
        formatElem.value = settings.format ?? 'uri';
      }

      // Toggle Focus Mode
      const focusMode = this.elements['form-options'].querySelector('[name="focus-mode"]');
      if (focusMode instanceof HTMLInputElement) {
        this.elements['form'].classList.toggle('focus-mode', focusMode.checked);
      }
    }
  }

  ///////////////////////////////////////////////////////////////
  // URL/Link Results
  ///////////////////////////////////////////////////////////////

  /**
   * Generates a new URL based on current Settings, and updates the Link Results.
   */
  updateUrlState() {
    const url = this.generateUrl();
    this.updateLinkResults(url);
  }

  /**
   * Generate a URL representing the current state of the Settings.
   *
   * This uses the Masked form of the Settings to avoid leaking `FormEntry` types marked as `password`.
   */
  private generateUrl() {
    const settings = this.options.getMaskedSettings();

    delete settings.forceShowSettings;

    settings.format =
      (this.settingsOptionsFormCache.format?.[0].split(':')[1] as PluginSettings['format']) ?? settings.format;

    const baseUrl = BaseUrl();
    const querystring = JsonToQueryString(settings);

    return querystring ? `${baseUrl}?${querystring}`.replace(/\?+$/, '') : '';
  }

  /**
   * Updates the Link Results state, which is the URL box and the "Load App" button.
   *
   * @param url - URL to update the Link Results box.
   */
  private updateLinkResults(url: string) {
    const linkResultsOutput = this.elements['link-results-output'];
    const btnLoadApp = this.elements['form-options'].querySelector('.button-load-app') as HTMLButtonElement;

    linkResultsOutput.value = url;
    btnLoadApp.disabled = true !== this.options.validateSettings();

    linkResultsOutput.parentElement?.setAttribute('data-char-count', linkResultsOutput.value.length.toString());
  }

  private onUrlMousePresence = (event: Event) => {
    if (false === event.target instanceof HTMLElement) {
      return;
    }

    this.onUrlMouseEnterDebouncer.cancel();

    event.target.classList.toggle('reveal', 'mouseenter' === event.type);
  };

  private urlClicked = false;
  private onUrlClick = (_event: Event) => {
    if (true === this.urlClicked) {
      return;
    }

    const resultsArea = this.elements['link-results-area'];
    const infoText = resultsArea.querySelector('.results-reveal')!;
    const oldInfo = infoText.innerHTML;

    // Cancel the delayed `mouseenter` event
    this.onUrlMouseEnterDebouncer.cancel();

    // Generate the URL and put it in the User's Clipboard
    const url = this.generateUrl();
    globalThis.navigator.clipboard.writeText(url || '');

    // Write COPIED into clicked area, and replace content after a delay
    resultsArea.classList.remove('reveal');
    infoText.innerHTML = '<h2>Copied!</h2>';

    this.urlClicked = true;
    setTimeout(() => {
      this.urlClicked = false;
      infoText.innerHTML = oldInfo;
    }, 2000);
  };

  ///////////////////////////////////////////////////////////////
  // Settings Options
  ///////////////////////////////////////////////////////////////

  /**
   * Updates the Local Form Data cache, and saves it into Local Storage.
   */
  public saveSettingsOptions() {
    // Serialize Form into JSON and store in LocalStorage
    this.settingsOptionsFormCache = Serialize(this.elements['form-options']);
    SetLocalStorageItem('settingsOptions', this.settingsOptionsFormCache);
  }

  /**
   * Event Handler for when the Settings Option Form changes.
   *
   * @param event - Event from Settings Option Input Element
   */
  private onSettingsOptionClick = (event: Event) => {
    if (false === event.target instanceof Element) {
      return;
    }

    if (false === event.target.classList.contains('settings-option')) {
      return;
    }

    if (event.target instanceof HTMLButtonElement) {
      // Don't let the form reload the page
      event.stopImmediatePropagation();
      event.preventDefault();

      // "Load App" Button Clicked
      if (event.target.classList.contains('button-load-app')) {
        this.loadApp();
      } else if (event.target.classList.contains('button-settings-reset')) {
        // Reset Button Clicked
        localStorage.clear();
        globalThis.location.href = BaseUrl();
      }
    }

    if (event.target instanceof HTMLInputElement) {
      if (event.target.name === 'focus-mode') {
        // Focus Mode clicked
        this.elements['form'].classList.toggle('focus-mode', event.target.checked);
      }
    }

    return true;
  };

  /**
   * Event Handler for when the Settings Options Form has an Input Change.
   *
   * @param event - Event from Settings Options Form.
   */
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

    this.saveSettingsOptions();
    this.updateUrlState();
  };

  ///////////////////////////////////////////////////////////////
  // Load App
  ///////////////////////////////////////////////////////////////

  /**
   * Loads the app in a new window, or current window based on Settings Options.
   */
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
      window.location.href = url || '';
    }
  }
}
