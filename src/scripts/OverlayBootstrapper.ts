import { PluginManager } from './managers/PluginManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { OverlayRenderer } from './renderers/OverlayRenderer.js';
import { SettingsRenderer } from './renderers/SettingsRenderer.js';
import { BootstrapOptions, ErrorManager, OverlaySettings, RendererConstructor, RendererInstance } from './types.js';

export class OverlayBootstrapper<OS extends OverlaySettings, CS extends Object> implements ErrorManager {
  settingsManager: SettingsManager<OS>;
  pluginManager: PluginManager<OS, CS>;

  constructor(public bootstrapOptions: BootstrapOptions<OS>) {
    this.settingsManager = new SettingsManager<OS>({
      locationHref: globalThis.location.href,
      settingsValidator: bootstrapOptions.settingsValidator
    });

    this.pluginManager = new PluginManager({
      settingsManager: this.settingsManager,
      renderOptions: bootstrapOptions.renderOptions
    });
  }

  async init() {
    const { needsSettingsRenderer, needsOverlayRenderer } = this.bootstrapOptions;
    let hasError: Error | undefined;

    try {
      await this.settingsManager.init();
      await this.pluginManager.init();
    } catch (err) {
      hasError = err as Error;
    }

    // Determine if `SettingsManager` is configured by way of `SettingsValidator`
    const isConfigured = this.settingsManager?.isConfigured || false;
    // Wants a `SettingsRenderer`, and `SettingsManager::isConfigured()` returns `false`
    const shouldRenderSettings = false === isConfigured && needsSettingsRenderer;
    // Wants an `OverlayRenderer`, and `SettingsManager::isConfigured()` returns `true`
    const shouldRenderOverlay = true === isConfigured && needsOverlayRenderer;

    // Select which Renderer to load...
    let rendererClass: RendererConstructor<OS, CS> | undefined =
      shouldRenderSettings ? SettingsRenderer
      : shouldRenderOverlay ? OverlayRenderer
      : undefined;

    // Any Renderer selected and existing, init to perform Render
    if (rendererClass) {
      const renderer: RendererInstance<CS> = new rendererClass({
        renderOptions: this.bootstrapOptions.renderOptions,
        pluginManager: this.pluginManager,
        settingsManager: this.settingsManager,
        errorManager: this
      });

      try {
        await renderer.init();
      } catch (err) {
        hasError = err as Error;
      }
    }

    if (hasError) {
      this.showError(hasError);
    }
  }

  showError = (err: Error) => {
    const root = this.bootstrapOptions.renderOptions.elements!['root']!;

    console.error(err);

    root.querySelector('dialog')?.remove();

    // TODO: Should be converted to a template!

    root.insertAdjacentHTML(
      'beforeend',
      `
        <dialog open>
        <article>
          <header>
            There was an Error
          </header>
          <p>${err.message}</p>

          <footer>
            <form method="dialog">
              <button role="button">OK</button>
            </form>
          </footer>
        </article>
      </dialog>
      `
    );
  };
}
