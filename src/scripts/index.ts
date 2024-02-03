import { OverlayBootstrapper } from './OverlayBootstrapper.js';
import Plugin_Core, { OverlaySettings_Chat } from './Plugin_Core.js';
import * as Managers from './managers/index.js';
import * as Renderers from './renderers/index.js';
import * as Utils from './utils/index.js';

// Lib Exports
export { Managers, Renderers, Utils };

// Start the overlay once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new OverlayBootstrapper<OverlaySettings_Chat>({
    renderOptions: {
      elements: {
        root: document.getElementById('root')!,
        container: document.getElementById('container-overlay')!
      },

      templates: {
        settings: Utils.PrepareTemplate('template-overlay-settings'),
        'chat-message': Utils.PrepareTemplate('template-chat-message')
      }
    },

    needsOverlayRenderer: true,
    needsSettingsRenderer: true,
    defaultPlugin: Plugin_Core
  });

  bootstrapper.init();
});
