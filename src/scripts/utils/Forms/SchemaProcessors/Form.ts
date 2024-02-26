/**
 * FormSchema Processor
 *
 * @module
 */

import merge from 'lodash.merge';
import { BuildFormSchema } from '../Builder.js';
import { FormSchema, FormSchemaEntryProcessor, InputTypeEntryMap, ProcessedFormSchema } from '../types.js';

/**
 * {@link FormSchema | `FormSchema`} Processor.
 *
 * Outputs HTML Form and internal elements.
 */
export class Form implements FormSchemaEntryProcessor {
  /** Running {@link InputTypeEntryMap | `InputTypeEntryMap`} for this Processor. Recursive/Iterative calls need to properly aggregate this value. */
  protected mapping: InputTypeEntryMap = {};

  /**
   * Retrieves Unique ID for this Processor.
   *
   * Generally speaking, this is used for a unique `HTMLElement` ID so
   * interactions with `<label>`s and other expected behaviors act accordingly.
   */
  get uniqueId() {
    return this.formId;
  }

  /**
   * Creates new {@link Form | `Form`}.
   *
   * @param entries - Collection of {@link FormSchemaEntry | `FormSchemaEntry`}s to build as an entire {@link FormSchema | `FormSchema`}.
   * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
   * @typeParam FormSchema - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   */
  constructor(
    protected entries: Readonly<FormSchema>,
    protected formData: Record<string, any>,
    private formId: string
  ) {}

  /**
   * Process the HTML Output for the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   */
  protected toString(): string {
    const subSchemaResults = BuildFormSchema(this.entries, this.formData);
    this.mapping = merge({}, this.mapping, subSchemaResults.mapping);

    return `
      <form id="#${this.formId}">
        ${subSchemaResults.html}
      </form>
    `;
  }

  /**
   * Process the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`} for both
   * HTML output and Entry Mapping.
   */
  process(): ProcessedFormSchema {
    return {
      html: this.toString(),
      mapping: this.mapping
    };
  }
}
