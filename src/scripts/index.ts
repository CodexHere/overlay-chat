import OverlayBootstrapper from './OverlayBootstrapper.js';
import { SettingsManager_Chat } from './SettingsManager_Chat.js';
import * as Managers from './managers/index.js';
import SettingsRenderer from './renderers/SettingsRenderer.js';
import * as Renderers from './renderers/index.js';
import * as Utils from './utils/index.js';

// Start the overlay once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new OverlayBootstrapper({
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

    constructorOptions: {
      overlayRenderer: Renderers.OverlayRenderer_Chat,
      settingsManager: SettingsManager_Chat,
      settingsRenderer: SettingsRenderer
    }
  });

  bootstrapper.init();
});

export { Managers, Renderers, Utils };
