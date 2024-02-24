import { SettingsSchemaSelect } from '../types.js';
import { SimpleInput } from './SimpleInput.js';

export class SelectInput extends SimpleInput<SettingsSchemaSelect> {
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
