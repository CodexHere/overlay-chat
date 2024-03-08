/**
 * Input Wrapper for most FormSchemaEntrys
 *
 * @module
 */

import { IsValidValue, ToId } from '../../Primitives.js';
import { FormSchemaEntryBase, FormSchemaEntryProcessor, ProcessedFormSchema } from '../types.js';

/**
 * Input Wrapper for most {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s.
 */
export class InputWrapper implements FormSchemaEntryProcessor {
  /**
   * Retrieves Unique ID for this Processor.
   *
   * Generally speaking, this is used for a unique `HTMLElement` ID so
   * interactions with `<label>`s and other expected behaviors act accordingly.
   */
  get uniqueId() {
    return '';
  }

  constructor(
    protected entry: FormSchemaEntryBase,
    private processedFormSchema: ProcessedFormSchema,
    private processor: FormSchemaEntryProcessor
  ) {}

  /**
   * Evaluate the given {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}
   * and express updated or new values for the Entry to be
   * considered for Processing output.
   */
  protected getCleanedEntryValues() {
    const chosenLabel = this.entry.label ?? this.entry.name;
    const nameOrLabelId = ToId(this.entry.name ?? this.entry.label);
    const tooltip = this.entry.tooltip ? `title="${this.entry.tooltip}"` : '';

    return { chosenLabel, nameOrLabelId, tooltip };
  }

  toString(): string {
    const { chosenLabel, tooltip } = this.getCleanedEntryValues();
    const skipForAttr = ['checkbox-multiple', 'switch-multiple', 'radio'];
    const forAttr = skipForAttr.includes(this.entry.inputType!) ? '' : `for="${this.processor.uniqueId}"`;

    const labelElem = false === IsValidValue(chosenLabel) ? '' : `<label ${forAttr} ${tooltip}>${chosenLabel}</label>`;

    return `
        <div data-input-type="${this.entry.inputType}">
          ${labelElem}
          ${this.processedFormSchema.html}
        </div>
      `;
  }

  /**
   * Process the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`} for both
   * HTML output and Entry Mapping.
   */
  process(): ProcessedFormSchema {
    return {
      html: this.toString(),
      mappings: this.processedFormSchema.mappings
    };
  }
}
