import { PluginSettingsBase } from '../types/Plugin.js';
import { RendererInstance, RendererInstanceOptions } from '../types/Renderers.js';

export class OverlayRenderer<OS extends PluginSettingsBase> implements RendererInstance {
  constructor(private options: RendererInstanceOptions<OS>) {}

  async init() {
    this.renderOverlay();
    this.injectSettingsIntoCSS();
  }

  private renderOverlay() {
    // Iterate over every loaded plugin, and call `renderOverlay` to manipulate the Overlay view
    this.options.getPlugins().forEach(plugin => {
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

  injectSettingsIntoCSS() {
    const style = globalThis.document.documentElement.style;
    const settings = this.options.getSettings();

    Object.keys(settings).forEach(key => {
      style.setProperty(`--${key}`, settings[key as keyof OS] as string);
    });
  }
}
