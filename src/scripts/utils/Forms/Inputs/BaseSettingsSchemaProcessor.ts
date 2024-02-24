import { SettingsSchemaEntryBase } from '../types.js';
import { AbstractSettingsSchemaProcessor } from './AbstractSettingsSchemaProcessor.js';

export class BaseSettingsSchemaProcessor<
  SchemaEntryType extends SettingsSchemaEntryBase
> extends AbstractSettingsSchemaProcessor<SchemaEntryType> {
  protected override getCleanedEntryValues() {
    const base = super.getCleanedEntryValues();
    const defaultData = this.entry.defaultValue ?? '';
    const required = this.entry.isRequired ? 'required' : '';
    const tooltip = this.entry.tooltip ? `title="${this.entry.tooltip}"` : '';

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
        name="${this.entry.name}"
        placeholder="${chosenLabel}"
        ${value}
        ${extraAttributes}
        ${required}
      >
    `;
  }
}
