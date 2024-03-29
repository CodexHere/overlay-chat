/**
 * Stylesheets Context Provider
 *
 * @module
 */

import { ContextProvider_Stylesheets } from '../types/ContextProviders.js';
import { PluginInstance } from '../types/Plugin.js';
import { AddStylesheet } from '../utils/DOM.js';
import { ToId } from '../utils/misc.js';

/**
 * Stylesheets Context Provider.
 *
 * Upon Registering/Unregistering, will Add/Remove a `<link>` tag to the CSS URL.
 */
export class StylesheetsContextProvider implements ContextProvider_Stylesheets {
  /**
   * Unregister Stylesheets for a Plugin.
   *
   * Removes `<link>` tag with matching *data-attribute* for the Plugin.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void {
    const id = ToId(plugin.name);

    // Remove link stylesheets with matching data attr
    globalThis.document.querySelector(`link[data-plugin-name="${id}"]`)?.remove();
  }

  /**
   * Registers a Stylesheet for a Plugin.
   *
   * Adds a *data-attribute* to associate with this Plugin, for Unregistering later.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param styleSheetUrl - URL of the Stylesheet to load.
   */
  register(plugin: PluginInstance, styleSheetUrl: URL): void {
    const link = AddStylesheet(styleSheetUrl.href);
    const id = ToId(plugin.name);

    // Apply data attr to match for removal on unregister()
    link.setAttribute('data-plugin-name', id);
  }
}
