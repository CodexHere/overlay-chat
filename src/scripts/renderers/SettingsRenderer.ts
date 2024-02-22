/**
 * Renderer for Settings portion of the Application
 *
 * @module
 */

import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import * as Forms from '../utils/Forms.js';
import { GetLocalStorageItem, SetLocalStorageItem } from '../utils/LocalStorage.js';
import { RenderTemplate } from '../utils/Templating.js';
import * as URI from '../utils/URI.js';
import { DebounceResult, debounce } from '../utils/misc.js';

/**
 * Elements we know about in this {@link RendererInstance | `RendererInstance`}.
 */
type ElementMap = {
  form: HTMLFormElement;
  'form-options': HTMLFormElement;
  'link-results-area': HTMLElement;
  'link-results-output': HTMLTextAreaElement;
};

// Changes to these Settings properties should restart the PluginManager
const settingShouldRestartPluginManager = ['plugins', 'customPlugins'];
// These combos of tags are used to identify Details Elements
const detailsTagTypes = ['DETAILS:', 'SUMMARY:', 'DIV:label-wrapper'];

// After this TTY, no longer "resume" scroll value
const ScrollTTY = 20; // in seconds
// Helper to evaluate whether the ScrolTTY has Expired
const isScrollTTYExpired = () => {
  const lastScrolledAt = Number(GetLocalStorageItem('lastScrolledAt') || 0);
  const now = new Date().getTime();
  const elapsed = now - lastScrolledAt;

  return elapsed >= ScrollTTY * 1000;
};

// How many ms it takes to reveal the URL
const URL_REVEAL_TTY = 2 * 1000;

// Unique ID created on load of this file. This is a re-use/busting ID for the "New Window" feature.
const instanceId = new Date().getTime();
// RegEx to find array-like index naming (i.e., `myObj[1]` would match).
const indexRegExp = new RegExp(/(.*)\[\d*\]$/);
// Remove the array-like index naming from a parameter name (i.e., `myObj[1]` -> `myObj`).
const RemoveArrayIndex = (paramName: string) => paramName.replace(indexRegExp, '$1');

/**
 * Renderer for displaying Settings, handling Plugin Configuration, allowing advanced configuration, etc.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class SettingsRenderer<PluginSettings extends PluginSettingsBase> implements RendererInstance {
  /** Debounced Handler called any of the Settings Form inputs are changed. */
  private _onSettingsChanged: (event: Event) => void;
  /** Handler for when the Settings Form is scrolled. */
  private _onFormScrolled: (event: Event) => void;
  /** Debounced Handler for when the URL Text is Moused. */
  private _onUrlMouseEnterDebouncer: DebounceResult;
  /** Local `ElementMap` mapping name -> Element the {@link RendererInstance | `RendererInstance`} needs to access. */
  private elements: ElementMap = {} as ElementMap;
  /** Local Deserialized instance of the Settings Options Form data. */
  private settingsOptionsFormCache: PluginSettings = {} as PluginSettings;

  /**
   * Get the PluginJumper Element, if it exists
   */
  private get pluginJumper() {
    return globalThis.document.getElementById('plugin-jumper') as HTMLSelectElement | undefined;
  }

  /**
   * Create a new {@link SettingsRenderer | `SettingsRenderer`}.
   *
   * @param options - Incoming Options for this Renderer.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private options: RendererInstanceOptions<PluginSettings>) {
    this._onSettingsChanged = debounce(this.onSettingsChanged, 750).handler;
    this._onFormScrolled = debounce(this.onFormScrolled, 100).handler;
    this._onUrlMouseEnterDebouncer = debounce(this.onUrlMousePresence, URL_REVEAL_TTY);
  }

  /**
   * Initialize the Renderer, kicking off the Lifecycle.
   */
  async init() {
    const plugins = this.options.getPlugins();

    this.unbindEvents();
    this.renderApp();
    this.buildElementMap();
    this.subInit();
    this.renderPluginSettings(plugins);

    this.bindEvents();
  }

  /**
   * Custom Initialization for this Renderer that doesn't fit into other Lifecycle methods.
   */
  private subInit() {
    const settings = this.options.getSettings();

    Forms.Hydrate(this.elements['form'], settings);

    this.createPluginJumper();
    this.restoreViewState(settings);

    // Update Form Validity state data only if we're starting with settings
    // > 1, because a 'format' is enforced on the settings object
    if (Object.keys(settings).length > 1) {
      const validations = this.options.validateSettings();
      Forms.UpdateFormValidators(this.elements.form, validations);
      this.saveSettingsOptions();
      this.updateUrlState();
    }
  }

  /**
   * Creates the PluginJumper Component, adding the Plugin Name as Options.
   */
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

  /**
   * Generates a new URL based on current Settings, and updates the Link Results.
   */
  private updateUrlState() {
    const url = this.generateUrl();
    this.updateLinkResults(url);
  }

  /**
   * The actual Renderer for the Application.
   * Builds/Injects base template for the Renderer.
   */
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

  /**
   * Iterates over all currently known Registered {@link PluginInstances | `PluginInstances`} and calls `renderSettings` to allow it to
   * do it's own manipulation of the DOM/Settings/etc.
   *
   * @param plugins - Currently known Registered {@link PluginInstances | `PluginInstances`}.
   */
  private renderPluginSettings(plugins: PluginInstances<PluginSettings>) {
    // Iterate over every loaded plugin, and call `renderSettings` to manipulate the Settings view
    plugins.forEach(plugin => {
      try {
        // If it exists, call `renderSettings`, and pass in our method to force a sync of Settings.
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

  /**
   * Force the current state of the Settings Form to be accepted as Settings.
   *
   * This is useful when a Plugin modifies the Settings Form, and doesn't correctly trigger
   * a Change Event.
   */
  private _forceSyncSettings = () => {
    // Get the current Settings Form data, and set it as the current System Settings
    const form = this.elements.form;
    const formData = Forms.GetData<PluginSettings>(form);
    this.options.setSettings(formData);

    // Validate Settings through all Plugins
    const validations = this.options.validateSettings();

    // Update the Settings Form Validation states
    Forms.UpdateFormValidators(this.elements.form, validations);
    // Update/Store the Settings Options
    this.saveSettingsOptions();
    // Update the URL State
    this.updateUrlState();
  };

  /**
   * Build the Local `ElementMap` this {@link RendererInstance | `RendererInstance`} needs to access.
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
   * Unbind/Remove Events we may be listening to, in order to avoid an Event Leak.
   */
  private unbindEvents() {
    const form = this.elements['form'];
    const formOptions = this.elements['form-options'];
    const resultsArea = this.elements['link-results-area'];
    const pluginJumper = this.pluginJumper;

    form?.removeEventListener('input', this._onSettingsChanged);
    form?.removeEventListener('click', this.onFormClicked);
    form?.removeEventListener('scroll', this._onFormScrolled);

    formOptions?.removeEventListener('click', this.onSettingsOptionClick);
    formOptions?.removeEventListener('change', this.onSettingsOptionChange);

    resultsArea?.removeEventListener('click', this.onUrlClick);
    resultsArea?.removeEventListener('mouseenter', this._onUrlMouseEnterDebouncer.handler);
    resultsArea?.removeEventListener('mouseleave', this.onUrlMousePresence);

    pluginJumper?.removeEventListener('change', this.onJumpPlugin);

    // Delegate Common Interaction Events
    Forms.UnbindInteractionEvents(form);
  }

  /**
   * Bind/Add Events we need to listen to for UX, Settings Validation, etc.
   */
  private bindEvents() {
    const form = this.elements['form'];
    const formOptions = this.elements['form-options'];
    const resultsArea = this.elements['link-results-area'];
    const pluginJumper = this.pluginJumper;

    form?.addEventListener('input', this._onSettingsChanged);
    form?.addEventListener('click', this.onFormClicked);
    form?.addEventListener('scroll', this._onFormScrolled);

    formOptions?.addEventListener('click', this.onSettingsOptionClick);
    formOptions?.addEventListener('change', this.onSettingsOptionChange);

    pluginJumper?.addEventListener('change', this.onJumpPlugin);

    // Delegate Common Interaction Events
    Forms.BindInteractionEvents(form);

    // Clipboard is disabled for some reason, gracefully degrade...
    if (!globalThis.navigator.clipboard) {
      resultsArea.classList.add('reveal');
      resultsArea.querySelector('.results-reveal')?.remove();
    } else {
      resultsArea?.addEventListener('click', this.onUrlClick);
      resultsArea?.addEventListener('mouseenter', this._onUrlMouseEnterDebouncer.handler);
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
      Forms.Hydrate(this.elements['form-options'], settingsOptions);

      // Set the Format option to the incoming Settings value
      const formatElem = this.elements['form-options'].querySelector('#settings-options-format');
      if (formatElem instanceof HTMLSelectElement) {
        formatElem.value = settings.format ?? 'uri';
      }
    }
  }

  /**
   * Event Handler for when Settings Form is Scrolled.
   * This will save the scroll offset to Local Settings.
   *
   * @param event - Event from Form.
   */
  private onFormScrolled = (event: Event) => {
    if (!event.target || false === event.target instanceof HTMLFormElement) {
      return;
    }

    // Form has scrolled
    const scrollHeight = event.target.scrollTop;
    SetLocalStorageItem('settingsFormTop', scrollHeight);
    SetLocalStorageItem('lastScrolledAt', new Date().getTime());
  };

  /**
   * Event Handler for when a Details Element is clicked.
   * Based on Open/Close state, will add/remove from Local Storage.
   *
   * @param event - Event from Element Clicked.
   */
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

  /**
   * Event Handler for when the Settings Form is Clicked.
   * The `Event` is delegated for further evaluation to other methods.
   *
   * @param event - Event from Form.
   */
  private onFormClicked = (event: MouseEvent) => {
    this.checkDetailsClicked(event);
  };

  /**
   * Updates the Local Storage data as a Set with the Details, and it's Parent's Details, ID.
   *
   * @param event - Event from Element Clicked
   */
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

  /**
   * Updates the Local Form Data cache, and saves it into Local Storage.
   */
  private saveSettingsOptions() {
    // Serialize Form into JSON and store in LocalStorage
    this.settingsOptionsFormCache = Forms.GetData(this.elements['form-options']);
    SetLocalStorageItem('settingsOptions', this.settingsOptionsFormCache);
  }

  /**
   * Event Handler for when Settings Form is Changed.
   * This will deserialize the Settings Form, store it, validate it, and
   * if the Plugin List changed will reload all Plugins.
   *
   * @param event - Event from Input Change in Settings Form.
   */
  private onSettingsChanged = async (event: Event) => {
    const target = event.target! as HTMLInputElement;
    const form = target.form!;

    this.saveSettingsOptions();

    const formData = Forms.GetData<PluginSettings>(form);
    const targetName = RemoveArrayIndex(target.name);

    // The Settings value changed is one that should cause a programmatic Restart
    if (settingShouldRestartPluginManager.includes(targetName)) {
      try {
        // Set the settings
        this.options.setSettings(formData, true);
        // Reload Plugins
        await this.options.pluginLoader();
        // Re-init this Renderer
        await this.init();
      } catch (err) {
        this.options.errorDisplay.showError(err as Error);
      }
    } else {
      // NO restart necessary, let's sync settings from User changes.
      this._forceSyncSettings();
    }
  };

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

    const baseUrl = URI.BaseUrl();
    const querystring = URI.JsonToQueryString(settings);

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

  /**
   * Event Handler for when the Settings Option Form changes.
   *
   * @param event - Event from Settings Option Input Element
   */
  private onSettingsOptionClick = (event: Event) => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    // Don't let the form reload the page
    event.stopImmediatePropagation();
    event.preventDefault();

    // "Load App" Button Clicked
    if (event.target.classList.contains('button-load-app')) {
      this.loadApp();
    } else if (event.target.classList.contains('button-settings-reset')) {
      // Reset Button Clicked
      localStorage.clear();
      globalThis.location.href = URI.BaseUrl();
    }
  };

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
      window.location.href = url;
    }
  }

  /**
   * Event Handler for when PluginJumper is Changed to jump to the Details
   * element for the Plugin Settings.
   *
   * @param event - Event from PluginJumper Element
   */
  private onJumpPlugin = (event: Event) => {
    if (false === event.target instanceof HTMLSelectElement) {
      return;
    }

    const containerId = event.target.value;
    const pluginContainer = globalThis.document.getElementById(containerId);

    pluginContainer?.setAttribute('open', '');
    pluginContainer?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  private onUrlMousePresence = (event: Event) => {
    if (false === event.target instanceof HTMLElement) {
      return;
    }

    this._onUrlMouseEnterDebouncer.cancel();

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
    this._onUrlMouseEnterDebouncer.cancel();

    // Generate the URL and put it in the User's Clipboard
    const url = this.generateUrl();
    globalThis.navigator.clipboard.writeText(url);

    // Write COPIED into clicked area, and replace content after a delay
    resultsArea.classList.remove('reveal');
    infoText.innerHTML = '<h2>Copied!</h2>';

    this.urlClicked = true;
    setTimeout(() => {
      this.urlClicked = false;
      infoText.innerHTML = oldInfo;
    }, 2000);
  };
}
