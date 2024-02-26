import { FormSchemaEntryBase } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

export class SimpleInput<SchemaEntry extends FormSchemaEntryBase> extends BaseFormSchemaProcessor<SchemaEntry> {
  protected override getExtraAttributes() {
    return `
      type="${this.entries.inputType}"
    `;
  }
}
