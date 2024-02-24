import { SettingsSchemaButton } from '../types.js';
import { AbstractSettingsSchemaProcessor } from './AbstractSettingsSchemaProcessor.js';

export class Button extends AbstractSettingsSchemaProcessor<SettingsSchemaButton> {
  protected override toString(): string {
    const { chosenLabel } = this.getCleanedEntryValues();

    return `<button id="${this.uniqueId}" name="${this.entry.name}">${chosenLabel}</button>`;
  }
}
