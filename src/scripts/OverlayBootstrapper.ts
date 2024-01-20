import { PluginManager } from './managers/PluginManager';
import SettingsManager from './managers/SettingsManager';
import { OverlayRenderer } from './renderers/OverlayRenderer';
import SettingsRenderer from './renderers/SettingsRenderer';
import { BootOptions } from './types';

export default class OverlayBootstrapper {
  public settingsManager: SettingsManager;
  public pluginManager: PluginManager;

  private _initialized: boolean = false;

  constructor(public bootOptions: BootOptions) {
    this.settingsManager = new bootOptions.settingsManager(globalThis.location.href);
    this.pluginManager = new PluginManager(this);
  }

  async init() {
    try {
      // Don't allow multiple initializations.
      // Generally this shouldnt happen, but since this is a public method, a plugin technically could
      //  call this method and wreak all kinds of havoc!
      if (this._initialized) {
        throw new Error('Bootstrapper is already initialized');
      }

      let rendererClass: typeof OverlayRenderer | typeof SettingsRenderer | undefined;

      await this.settingsManager.init();
      await this.pluginManager.init();

      // Unconfigured, and has SettingsRenderer specified
      if (false === this.settingsManager?.isConfigured && this.bootOptions.settingsRenderer) {
        rendererClass = this.bootOptions.settingsRenderer;
      } else if (this.bootOptions.overlayRenderer) {
        // Configured, and has OverlayRenderer specified
        rendererClass = this.bootOptions.overlayRenderer;
      }

      // Any Renderer selected and existing, init to perform Render
      if (rendererClass) {
        new rendererClass(this).init();
      }

      this._initialized = true;
    } catch (err) {
      this.showError(err as Error);
    }
  }

  showError = (err: Error) => {
    const root = this.bootOptions.elements!['root']!;

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
