import { Bootstrapper } from './AppBootstrapper.js';
import Plugin_Core, { AppSettings_Chat } from './Plugin_Core.js';
import * as Managers from './managers/index.js';
import * as Renderers from './renderers/index.js';
import * as Utils from './utils/index.js';

// Lib Exports
export { Managers, Renderers, Utils };

// Start the App once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new Bootstrapper<AppSettings_Chat>({
    needsAppRenderer: true,
    needsSettingsRenderer: true,
    defaultPlugin: Plugin_Core,
    // TODO This should move to the plugin-level via registration
    templateFile: new URL('/templates/template.html', Utils.BaseUrl())
  });

  bootstrapper.init();
});
