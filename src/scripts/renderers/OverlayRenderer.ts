import { PluginInstances, PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';
import { RenderTemplate } from '../utils/Templating.js';

type ElementMap = {
  'show-settings': HTMLElement;
};

export class OverlayRenderer<PluginSettings extends PluginSettingsBase> implements RendererInstance {
  private elements: ElementMap = {} as ElementMap;

  constructor(private options: RendererInstanceOptions<PluginSettings>) {}

  async init() {
    const plugins = this.options.getPlugins();

    // this.unbindEvents();
    this.renderOverlay();
    this.renderPluginOverlay(plugins);
    this.buildElementMap();
    this.bindEvents();

    this.subInit();
  }

  private subInit() {
    this.injectSettingsIntoCSS();
  }

  private renderOverlay() {
    const { rootContainer, templates } = this.options.renderOptions;

    if (!rootContainer) {
      return;
    }

    // Ensure no elements in the Root so we can display the App!
    rootContainer.innerHTML = '';
    RenderTemplate(rootContainer, templates['app']);
  }

  private renderPluginOverlay(plugins: PluginInstances<PluginSettings>) {
    // Iterate over every loaded plugin, and call `renderOverlay` to manipulate the Overlay view
    plugins.forEach(plugin => {
      try {
        plugin.renderOverlay?.();
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderOverlay\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
          );
        }
      }
    });
  }

  private buildElementMap() {
    const root = this.options.renderOptions.rootContainer;

    // Establish `elements` now that the Settings Form has been injected into DOM
    this.elements['show-settings'] = root.querySelector('#show-settings')!;
  }

  private bindEvents() {
    this.elements['show-settings'].addEventListener('click', () => {
      globalThis.location.href += `&forceShowSettings=true`;
    });
  }

  private injectSettingsIntoCSS() {
    const style = globalThis.document.documentElement.style;
    const settings = this.options.getSettings();

    Object.keys(settings).forEach(key => {
      style.setProperty(`--${key}`, settings[key as keyof PluginSettings] as string);
    });
  }
}
