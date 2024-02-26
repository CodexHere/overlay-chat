/**
 * FormSchemaButton Processor
 *
 * @module
 */

import { FormSchemaButton } from '../../types.js';
import { AbstractFormSchemaProcessor } from '../AbstractFormSchemaProcessor.js';

/**
 * {@link FormSchemaButton | `FormSchemaButton`} Processor.
 *
 * Outputs HTML Button Tag.
 */
export class Button extends AbstractFormSchemaProcessor<FormSchemaButton> {
  protected override toString(): string {
    const { chosenLabel } = this.getCleanedEntryValues();

    return `<button id="${this.uniqueId}" name="${this.entry.name}">${chosenLabel}</button>`;
  }
}
