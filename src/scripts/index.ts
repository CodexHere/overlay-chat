import OverlayBootstrapper from './OverlayBootstrapper';
import { SettingsManager_Chat } from './SettingsManager_Chat';
import { OverlayRenderer_Chat } from './renderers/OverlayRenderer';
import SettingsRenderer from './renderers/SettingsRenderer';
import { Templating } from './utils/Templating';

// Start the overlay once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new OverlayBootstrapper({
    elements: {
      body: document.getElementsByTagName('body')[0],
      container: document.getElementById('container-overlay') as HTMLElement
    },

    templates: {
      settings: Templating.PrepareTemplate('template-overlay-settings'),
      'chat-message': Templating.PrepareTemplate('template-chat-message')
    },

    settingsManager: SettingsManager_Chat,
    settingsRenderer: SettingsRenderer,
    overlayRenderer: OverlayRenderer_Chat
  });

  bootstrapper.init();
});
