/**
 * Base FormSchema Processor Definition
 *
 * @module
 */

import { IsValidValue } from '../../Primitives.js';
import { FormSchemaEntryBase, NameFormSchemaEntryOverrideMap } from '../types.js';
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
  /**
   * Creates new {@link BaseFormSchemaProcessor | `BaseFormSchemaProcessor`}.
   *
   * @param entry - Supply a single {@link FormSchemaEntry | `FormSchemaEntry`} as the original from the Plugin that Registered it.
   * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
   * @param schemaOverrides - A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time.
   */
  constructor(entry: SchemaEntryType, formData: Record<string, any>, schemaOverrides?: NameFormSchemaEntryOverrideMap) {
    super(entry, formData, schemaOverrides);

    if (true === this.entry.isReadOnly && false === IsValidValue(this.entry.defaultValue)) {
      throw new Error(`FormSchemaEntry for "${this.entry.name}" is marked ReadOnly but no Default Value set!`);
    }

    if (true === this.entry.isDisabled && false === IsValidValue(this.entry.defaultValue)) {
      throw new Error(`FormSchemaEntry for "${this.entry.name}" is marked Disabled but no Default Value set!`);
    }
  }

  protected override getCleanedEntryValues() {
    const defaultData = this.entry.defaultValue ?? '';
    const required = this.entry.isRequired ? 'required' : '';
    const tooltip = this.entry.tooltip ? `title="${this.entry.tooltip}"` : '';

    return {
      ...super.getCleanedEntryValues(),
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
    const { defaultData, required } = this.getCleanedEntryValues();
    const type = `type="${this.entry.inputType}"`;
    const value = defaultData ? `value="${defaultData}"` : '';
    const readonly = true === this.entry.isReadOnly ? 'readonly' : '';
    const disabled = true === this.entry.isDisabled ? 'disabled' : '';

    return `
      ${type}
      ${value}
      ${required}
      ${readonly}
      ${disabled}
    `;
  }

  protected override toString(): string {
    const { chosenLabel } = this.getCleanedEntryValues();
    const extraAttributes = this.getExtraAttributes();

    return `
      <input
        id="${this.uniqueId}"
        name="${this.entry.name}"
        placeholder="${chosenLabel}"
        ${extraAttributes}
      >
    `;
  }
}
