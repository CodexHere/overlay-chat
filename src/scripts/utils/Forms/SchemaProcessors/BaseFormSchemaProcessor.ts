import { FormSchemaEntryBase } from '../types.js';
import { AbstractFormSchemaProcessor } from './AbstractFormSchemaProcessor.js';

export class BaseFormSchemaProcessor<
  SchemaEntryType extends FormSchemaEntryBase
> extends AbstractFormSchemaProcessor<SchemaEntryType> {
  protected override getCleanedEntryValues() {
    const base = super.getCleanedEntryValues();
    const defaultData = this.entries.defaultValue ?? '';
    const required = this.entries.isRequired ? 'required' : '';
    const tooltip = this.entries.tooltip ? `title="${this.entries.tooltip}"` : '';

    return {
      ...base,
      defaultData,
      required,
      tooltip
    };
  }

  protected getExtraAttributes() {
    return '';
  }

  protected override toString(): string {
    const { chosenLabel, defaultData, required } = this.getCleanedEntryValues();
    const extraAttributes = this.getExtraAttributes();
    const value = defaultData ? `value="${defaultData}"` : '';

    return `
      <input
        id="${this.uniqueId}"
        name="${this.entries.name}"
        placeholder="${chosenLabel}"
        ${value}
        ${extraAttributes}
        ${required}
      >
    `;
  }
}
