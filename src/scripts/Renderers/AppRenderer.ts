/**
 * Renderer for Application portion of the Application
 *
 * @module
 */

import { EventEmitter } from 'events';
import { PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import { RenderTemplate } from '../utils/Templating.js';

/**
 * Elements we know about in this `RendererInstance`.
 */
type ElementMap = {
  'show-settings': HTMLElement;
};

/**
 * Renderer for displaying the Application, handling Plugin Configuration, allowing advanced DOM manipulation, etc.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class AppRenderer<PluginSettings extends PluginSettingsBase> extends EventEmitter implements RendererInstance {
  /** Local `ElementMap` mapping name -> Element the {@link RendererInstance | `RendererInstance`} needs to access. */
  private elements: ElementMap = {} as ElementMap;

  /**
   * Create a new {@link AppRenderer | `AppRenderer`}.
   *
   * @param options - Incoming Options for this Renderer.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private options: RendererInstanceOptions) {
    super();
  }

  /**
   * Initialize the Renderer, kicking off the Lifecycle.
   */
  async init() {
    // this.unbindEvents();
    this.renderApp();
    this.buildElementMap();
    this.subInit();

    this.bindEvents();
  }

  /**
   * Custom Initialization for this Renderer that doesn't fit into other Lifecycle methods.
   */
  private subInit() {
    this.injectSettingsIntoCSS();
  }

  /**
   * The actual Renderer for the Application.
   * Builds/Injects base template for the Renderer.
   */
  private renderApp() {
    const rootContainer = globalThis.document.body.querySelector('#root') as HTMLElement;
    const appTemplate = this.options.template.context?.getId('app');

    if (!rootContainer || !appTemplate) {
      return;
    }

    // Ensure no elements in the Root so we can display the App!
    rootContainer.innerHTML = '';
    RenderTemplate(rootContainer, appTemplate);
  }

  /**
   * Build the Local `ElementMap` this {@link types/Renderers.RendererInstance | `RendererInstance`} needs to access.
   */
  private buildElementMap() {
    const body = globalThis.document.body;

    // Establish `elements` now that the Settings Form has been injected into DOM
    this.elements['show-settings'] = body.querySelector('#show-settings')!;
  }

  /**
   * Bind/Add Events we need to listen to for UX, Settings Validation, etc.
   */
  private bindEvents() {
    this.elements['show-settings'].addEventListener('click', () => {
      globalThis.location.href += `&forceShowSettings=true`;
    });
  }

  /**
   * Injects all Settings Names/Values into CSS as keys in the `document.style` value.
   *
   * This is a quick and dirty way of getting a lot of great functionality in CSS from Settings.
   */
  private injectSettingsIntoCSS() {
    const style = globalThis.document.documentElement.style;
    const settings = this.options.settings.get<PluginSettings>('encrypted');

    Object.keys(settings).forEach(key => {
      style.setProperty(`--${key}`, settings[key as keyof PluginSettings] as string);
    });
  }
}
