import { Bootstrapper } from './OverlayBootstrapper.js';
import Plugin_Core, { OverlaySettings_Chat } from './Plugin_Core.js';
import * as Managers from './managers/index.js';
import * as Renderers from './renderers/index.js';
import * as Utils from './utils/index.js';

// Lib Exports
export { Managers, Renderers, Utils };

// Start the App once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new Bootstrapper<OverlaySettings_Chat>({
    needsAppRenderer: true,
    needsSettingsRenderer: true,
    defaultPlugin: Plugin_Core,
    rootContainer: document.getElementById('root')!,
    templateFile: new URL('/templates/template.html', Utils.BaseUrl())
  });

  bootstrapper.init();
});
