/**
 * FormSchemaSelect Processor
 *
 * @module
 */

import { FormSchemaSelect, NameFormSchemaEntryOverrideMap } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

/**
 * {@link FormSchemaSelect | `FormSchemaSelect`} Processor.
 *
 * Outputs HTML Select Tag with capability of including the `multiple` attribute.
 */
export class SelectInput extends BaseFormSchemaProcessor<FormSchemaSelect> {
  constructor(
    entry: FormSchemaSelect,
    formData: Record<string, any>,
    schemaOverrides?: NameFormSchemaEntryOverrideMap
  ) {
    if (!entry.values) {
      throw new Error('Missing `values` in Entry!');
    }

    super(entry, formData, schemaOverrides);
  }

  override toString(): string {
    const entry = this.entry;
    const { defaultData, required } = this.getCleanedEntryValues();
    const isMulti = 'select-multiple' === this.entry.inputType ? 'multiple' : '';
    const options = entry.values.reduce(
      (_options, value) => `${_options}<option value="${value}">${value}</option>`,
      ''
    );

    return `
      <select
        id="${this.uniqueId}"
        name="${entry.name}"
        value="${defaultData}"
        ${isMulti}
        ${required}
      >
        ${options}
      </select>
    `;
  }
}
