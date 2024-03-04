/**
 * Context Provider for Display
 *
 * @module
 */

import { TemplateManager } from '../Managers/TemplateManager.js';
import { ContextProvider_Display } from '../types/ContextProviders.js';
import { RenderTemplate } from '../utils/Templating.js';

/**
 * Context Provider for Display.
 */
export class DisplayContextProvider implements ContextProvider_Display {
  /**
   * Create a new {@link DisplayContextProvider | `DisplayContextProvider`}.
   *
   * @param manager - Instance of {@link TemplateManager | `TemplateManager`} to get Templates from.
   */
  constructor(private manager: TemplateManager) {}

  /**
   * Display an Info message to the User.
   *
   * @param message - Message to display to the User.
   * @param title - Title of modal dialogue.
   */
  showInfo = (message: string, title?: string | undefined): void => {
    const body = globalThis.document.body;
    const template = this.manager.context?.getId('modalMessage');

    if (!template) {
      return;
    }

    // Render `modalMessage` Template to the `body`.
    RenderTemplate(body, template, {
      title: title ?? 'Information',
      message
    });
  };

  /**
   * Display an `Error` message to the User.
   *
   * @param err - The `Error`, or collection of `Error`s, to present to the User.
   */
  showError = (err: Error | Error[]) => {
    const body = globalThis.document.body;

    if (!err) {
      return;
    }

    // Convert to Array
    err = Array.isArray(err) ? err : [err];

    if (0 === err.length) {
      return;
    }

    err.forEach(console.error);

    // Render `modalMessage` Template to the `body`.
    const template = this.manager.context?.getId('modalMessage');

    if (!template) {
      return;
    }

    RenderTemplate(body, template, {
      title: 'There was an Error',
      message: err.map(e => e.message).join('<br> <br>')
    });
  };
}
