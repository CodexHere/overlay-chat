import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import { RenderTemplate } from '../utils/Templating.js';

/**
 * Elements we know about in this {@link RendererInstance | `RendererInstance`}.
 */
type ElementMap = {
  'show-settings': HTMLElement;
};

/**
 * Renderer for displaying the Application, handling Plugin Configuration, allowing advanced DOM manipulation, etc.
 *
 * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
 */
export class AppRenderer<PluginSettings extends PluginSettingsBase> implements RendererInstance {
  /** Local `ElementMap` mapping name -> Element the {@link RendererInstance | `RendererInstance`} needs to access. */
  private elements: ElementMap = {} as ElementMap;

  /**
   * Create a new {@link AppRenderer | `AppRenderer`}.
   *
   * @param options Incoming Options for this Renderer.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  constructor(private options: RendererInstanceOptions<PluginSettings>) {}

  /**
   * Initialize the Renderer, kicking off the Lifecycle.
   */
  async init() {
    const plugins = this.options.getPlugins();

    // this.unbindEvents();
    this.renderApp();
    this.buildElementMap();
    this.subInit();
    this.renderPluginApp(plugins);

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
    const { app: appTemplate } = this.options.getTemplates();

    if (!rootContainer) {
      return;
    }

    // Ensure no elements in the Root so we can display the App!
    rootContainer.innerHTML = '';
    RenderTemplate(rootContainer, appTemplate);
  }

  /**
   * Iterates over all currently known Registered Plugins and calls `renderApp` to allow it to
   * do it's own manipulation of the DOM/Settings/etc.
   *
   * @param plugins Currently known Registered Plugins.
   * @typeParam PluginSettings - Shape of the Settings object the Plugin can access.
   */
  private renderPluginApp(plugins: PluginInstances<PluginSettings>) {
    // Iterate over every loaded plugin, and call `renderApp` to manipulate the App view
    plugins.forEach(plugin => {
      try {
        plugin.renderApp?.();
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderApp\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
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
    const settings = this.options.getMaskedSettings();

    Object.keys(settings).forEach(key => {
      style.setProperty(`--${key}`, settings[key as keyof PluginSettings] as string);
    });
  }
}
