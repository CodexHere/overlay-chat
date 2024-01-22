import PluginManager from './managers/PluginManager.js';
import SettingsManager from './managers/SettingsManager.js';
import { BootstrapOptions, ErrorManager, RendererConstructor } from './types.js';

export default class OverlayBootstrapper implements ErrorManager {
  public settingsManager: SettingsManager;
  public pluginManager: PluginManager;

  private _initialized: boolean = false;

  constructor(public bootstrapOptions: BootstrapOptions) {
    this.settingsManager = new bootstrapOptions.constructorOptions.settingsManager(globalThis.location.href);
    this.pluginManager = new PluginManager(
      {
        settingsManager: this.settingsManager,
        errorManager: this
      },
      bootstrapOptions.renderOptions
    );
  }

  async init() {
    const ctors = this.bootstrapOptions.constructorOptions;

    try {
      // Don't allow multiple initializations.
      // Generally this shouldnt happen, but since this is a public method, a plugin technically could
      //  call this method and wreak all kinds of havoc!
      if (this._initialized) {
        throw new Error('Bootstrapper is already initialized');
      }

      let rendererClass: RendererConstructor | undefined;

      await this.settingsManager.init();
      await this.pluginManager.init();

      // Unconfigured, and has SettingsRenderer specified
      if (false === this.settingsManager?.isConfigured && ctors.settingsRenderer) {
        rendererClass = ctors.settingsRenderer;
      } else if (ctors.overlayRenderer) {
        // Configured, and has OverlayRenderer specified
        rendererClass = ctors.overlayRenderer;
      }

      // Any Renderer selected and existing, init to perform Render
      if (rendererClass) {
        new rendererClass(
          {
            pluginManager: this.pluginManager,
            settingsManager: this.settingsManager,
            errorManager: this
          },
          this.bootstrapOptions.renderOptions
        ).init();
      }

      this._initialized = true;
    } catch (err) {
      this.showError(err as Error);
    }
  }

  showError = (err: Error) => {
    const root = this.bootstrapOptions.renderOptions.elements!['root']!;

    console.error(err);

    // TODO: Should be converted to a template!

    root.insertAdjacentHTML(
      'beforeend',
      `
        <dialog open>
        <article>
          <header>
            <a href="#close" aria-label="Close" class="close"></a>
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
