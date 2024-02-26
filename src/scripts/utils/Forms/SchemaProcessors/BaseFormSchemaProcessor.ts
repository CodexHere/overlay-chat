/**
 * Base FormSchema Processor Definition
 *
 * @module
 */

import { FormSchemaEntryBase } from '../types.js';
import { AbstractFormSchemaProcessor } from './AbstractFormSchemaProcessor.js';

/**
 * Base FormSchema Processor Definition.
 * 
 * Outputs HTML Input Tag with common attributes, and cleans common Entry Values.
 *
 * @typeParam SchemaEntryType - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
 */
export class BaseFormSchemaProcessor<
  SchemaEntryType extends FormSchemaEntryBase
> extends AbstractFormSchemaProcessor<SchemaEntryType> {
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

  /**
   * Generate Extra Attributes to be added to the `<input>` field
   * when processing `toString()`.
   */
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
