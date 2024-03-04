/**
 * FormSchemaSelect Processor
 *
 * @module
 */

import { FormSchemaSelect } from '../../types.js';
import { SimpleInput } from './SimpleInput.js';

/**
 * {@link FormSchemaSelect | `FormSchemaSelect`} Processor.
 *
 * Outputs HTML Select Tag with capability of including the `multiple` attribute.
 */
export class SelectInput extends SimpleInput<FormSchemaSelect> {
  constructor(
    protected entry: FormSchemaSelect,
    protected formData: Record<string, any>
  ) {
    if (!entry.values) {
      throw new Error('Missing `values` in Entry!');
    }

    super(entry, formData);
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
