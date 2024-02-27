/**
 * FormSchemaEntryBase Processor
 *
 * @module
 */

import { FormSchemaEntryBase } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

/**
 * {@link FormSchemaEntryBase | `FormSchemaEntryBase`} Processor.
 *
 * Outputs HTML Input Tag with `type` attribute.
 *
 * @typeParam SchemaEntryType - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
 */
export class SimpleInput<SchemaEntryType extends FormSchemaEntryBase> extends BaseFormSchemaProcessor<SchemaEntryType> {
  protected override getExtraAttributes() {
    return `
      type="${this.entry.inputType}"
    `;
  }
}
