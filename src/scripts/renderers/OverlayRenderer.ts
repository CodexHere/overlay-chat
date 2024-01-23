import { ContextBase, OverlaySettings, RendererInstance, RendererInstanceOptions } from '../types.js';

export class OverlayRenderer<OS extends OverlaySettings, Context extends ContextBase> implements RendererInstance {
  constructor(private options: RendererInstanceOptions<OS, Context>) {}

  async init() {
    this.renderOverlay();
    this.injectSettingsIntoCSS();
  }

  private renderOverlay() {
    // Iterate over every loaded plugin, and call `renderOverlay` to manipulate the Overlay view
    this.options.pluginManager.getPlugins().forEach(plugin => {
      try {
        plugin.renderOverlay?.(this.options.renderOptions);
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
    const settings = this.options.settingsManager.getSettings();

    Object.keys(settings).forEach(key => {
      style.setProperty(`--${key}`, settings[key as keyof OS] as string);
    });
  }
}
