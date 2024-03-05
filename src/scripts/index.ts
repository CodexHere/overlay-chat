import { AppBootstrapper } from './AppBootstrapper.js';
import Plugin_Core, { AppSettings_Chat } from './Plugin_Core.js';

// Start the Application once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new AppBootstrapper<AppSettings_Chat>({
    needsAppRenderer: true,
    needsConfigurationRenderer: true,
    defaultPlugin: Plugin_Core
  });

  bootstrapper.init();
});
