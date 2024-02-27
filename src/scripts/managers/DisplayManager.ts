/**
 * Manages showing Messages to the User
 *
 * @module
 */

import { DisplayAccessor, DisplayManagerOptions } from '../types/Managers.js';
import { RenderTemplate } from '../utils/Templating.js';
import { TemplateIDsBase } from './TemplateManager.js';

/**
 * Manages showing Messages to the User.
 *
 * Capable of showing Info and Error Messages.
 */
export class DisplayManager implements DisplayAccessor {
  /**
   * Create a new {@link DisplayManager | `DisplayManager`}.
   *
   * @param options - Incoming Options for the {@link DisplayManager | `DisplayManager`}.
   */
  constructor(private options: DisplayManagerOptions) {}

  /**
   * No Op - Just here to match other Managers
   */
  async init() {}

  /**
   * Display an info message to the User.
   *
   * @param message - Message to display to the User.
   * @param title - Title of modal dialogue.
   */
  showInfo = (message: string, title?: string | undefined): void => {
    const body = globalThis.document.body;
    const templates = this.options.getTemplates<TemplateIDsBase>()!;

    // Render `modalMessage` Template to the `body`.
    RenderTemplate(body, templates.modalMessage, {
      title: title ?? 'Information',
      message
    });
  };

  /**
   * Display an error message to the User.
   *
   * @param err - The `Error`, or collection of `Error`s to present to the User.
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
    const templates = this.options.getTemplates<TemplateIDsBase>()!;
    RenderTemplate(body, templates.modalMessage, {
      title: 'There was an Error',
      message: err.map(e => e.message).join('<br> <br>')
    });
  };
}
