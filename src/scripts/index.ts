import { OverlayBootstrapper } from './OverlayBootstrapper.js';
import * as Managers from './managers/index.js';
import * as Renderers from './renderers/index.js';
import { OverlaySettings } from './types.js';
import * as Utils from './utils/index.js';

// Lib Exports
export { Managers, Renderers, Utils };

type OverlaySettings_Chat = OverlaySettings & {
  fontSize: number;
};

type MiddewareContext_Chat = {};

// Start the overlay once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new OverlayBootstrapper<OverlaySettings_Chat, MiddewareContext_Chat>({
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
    settingsValidator: settings => {
      return !!settings.channelName && !!settings.fontSize;
    }
  });

  bootstrapper.init();
});
