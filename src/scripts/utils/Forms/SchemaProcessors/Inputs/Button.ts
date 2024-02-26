import { FormSchemaButton } from '../../types.js';
import { AbstractFormSchemaProcessor } from '../AbstractFormSchemaProcessor.js';

export class Button extends AbstractFormSchemaProcessor<FormSchemaButton> {
  protected override toString(): string {
    const { chosenLabel } = this.getCleanedEntryValues();

    return `<button id="${this.uniqueId}" name="${this.entries.name}">${chosenLabel}</button>`;
  }
}
