import { AppBootstrapper } from './AppBootstrapper.js';
import Plugin_Core from './Plugin_Core.js';

// Start the Application once DOM has loaded
document.addEventListener('DOMContentLoaded', () => {
  const bootstrapper = new AppBootstrapper({
    needsAppRenderer: true,
    needsConfigurationRenderer: true,
    defaultPlugin: Plugin_Core
  });

  bootstrapper.init();
});
