import { SettingsSchemaEntryBase } from '../types.js';
import { BaseSettingsSchemaProcessor } from './BaseSettingsSchemaProcessor.js';

export class SimpleInput<SchemaEntry extends SettingsSchemaEntryBase> extends BaseSettingsSchemaProcessor<SchemaEntry> {
  protected override getExtraAttributes() {
    return `
      type="${this.entry.inputType}"
    `;
  }
}
