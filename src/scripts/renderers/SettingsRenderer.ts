/**
 * Renderer for Settings portion of the Application
 *
 * @module
 */

import { EventEmitter } from 'events';
import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceEvents, RendererInstanceOptions } from '../types/Renderers.js';
import * as Forms from '../utils/Forms.js';
import { GetLocalStorageItem, SetLocalStorageItem } from '../utils/LocalStorage.js';
import { RenderTemplate } from '../utils/Templating.js';
import { debounce } from '../utils/misc.js';
import { SettingsRendererHelper } from './SettingsRendererHelper.js';

/**
 * Elements we know about in this {@link RendererInstance | `RendererInstance`}.
 */
type ElementMap = {
  form: HTMLFormElement;
};

// Changes to these Settings properties should restart the PluginManager
const settingShouldRestartPluginManager = ['plugins', 'customPlugins'];
// These combos of tags are used to identify Details Elements
const detailsTagTypes = ['DETAILS:', 'SUMMARY:', 'DIV:label-wrapper'];
// RegEx to find array-like index naming (i.e., `myObj[1]` would match).
const indexRegExp = new RegExp(/(.*)\[\d*\]$/);
// Remove the array-like index naming from a parameter name (i.e., `myObj[1]` -> `myObj`).
const RemoveArrayIndex = (paramName: string) => paramName.replace(indexRegExp, '$1');

/**
 * Renderer for displaying Settings, handling Plugin Configuration, allowing advanced configuration, etc.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class SettingsRenderer<PluginSettings extends PluginSettingsBase>
  extends EventEmitter
  implements RendererInstance
{
  /** Delegated UX Behaviors to a Helper Class */
  private helper?: SettingsRendererHelper<PluginSettings>;
  /** Debounced Handler called any of the Settings Form inputs are changed. */
  private _onSettingsChanged: (event: Event) => void;
  /** Handler for when the Settings Form is scrolled. */
  private _onFormScrolled: (event: Event) => void;
  /** Local `ElementMap` mapping name -> Element the {@link RendererInstance | `RendererInstance`} needs to access. */
  private elements: ElementMap = {} as ElementMap;

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
    super();

    this._onSettingsChanged = debounce(this.onSettingsChanged, 750).handler;
    this._onFormScrolled = debounce(this.onFormScrolled, 100).handler;
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

    this.createPluginJumper();

    Forms.Hydrate(this.elements['form'], settings);

    this.helper = new SettingsRendererHelper(this.options);
    this.helper.init();

    // Update Form Validity state data only if we're starting with settings
    // > 1, because a 'format' is enforced on the settings object
    if (Object.keys(settings).length > 1) {
      const validations = this.options.validateSettings();
      Forms.UpdateFormValidators(this.elements.form, validations);
      this.helper?.saveSettingsOptions();
      this.helper?.updateUrlState();
    }
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
   * Build the Local `ElementMap` this {@link RendererInstance | `RendererInstance`} needs to access.
   */
  private buildElementMap() {
    const body = globalThis.document.body;

    this.elements['form'] = body.querySelector('form#settings')!;
  }

  /**
   * Unbind/Remove Events we may be listening to, in order to avoid an Event Leak.
   */
  private unbindEvents() {
    const form = this.elements['form'];
    form?.removeEventListener('input', this._onSettingsChanged);
    form?.removeEventListener('click', this.onFormClicked);
    form?.removeEventListener('scroll', this._onFormScrolled);

    const pluginJumper = this.pluginJumper;
    pluginJumper?.removeEventListener('change', this.onJumpPlugin);

    // Delegate Common Interaction Events
    Forms.UnbindInteractionEvents(form);
  }

  /**
   * Bind/Add Events we need to listen to for UX, Settings Validation, etc.
   */
  private bindEvents() {
    const form = this.elements['form'];
    form?.addEventListener('input', this._onSettingsChanged);
    form?.addEventListener('click', this.onFormClicked);
    form?.addEventListener('scroll', this._onFormScrolled);

    const pluginJumper = this.pluginJumper;
    pluginJumper?.addEventListener('change', this.onJumpPlugin);

    // Delegate Common Interaction Events
    Forms.BindInteractionEvents(form);
  }

  ///////////////////////////////////////////////////////////////
  // Settings
  ///////////////////////////////////////////////////////////////

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

    this.helper?.saveSettingsOptions();

    const formData = Forms.GetData<PluginSettings>(form);
    const targetName = RemoveArrayIndex(target.name);

    // The Settings value changed is one that should cause a programmatic Restart
    if (settingShouldRestartPluginManager.includes(targetName)) {
      try {
        // Set the settings
        this.options.setSettings(formData, true);
        // Event to the System that the Plugin List has changed
        this.emit(RendererInstanceEvents.PLUGINS_STALE);
      } catch (err) {
        this.options.display.showError(err as Error);
      }
    } else {
      // NO restart necessary, let's sync settings from User changes.
      this._forceSyncSettings();
    }
  };

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
    this.helper?.saveSettingsOptions();
    // Update the URL State
    this.helper?.updateUrlState();
  };

  ///////////////////////////////////////////////////////////////
  // Form UX Behaviors
  ///////////////////////////////////////////////////////////////

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

  ///////////////////////////////////////////////////////////////
  // Plugin Jumper
  ///////////////////////////////////////////////////////////////

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
}
