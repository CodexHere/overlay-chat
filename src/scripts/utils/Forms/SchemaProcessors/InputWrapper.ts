/**
 * Input Wrapper for most FormSchemaEntrys
 *
 * @module
 */

import { FormSchemaEntryBase, FormSchemaEntryProcessor } from '../types.js';
import { BaseFormSchemaProcessor } from './BaseFormSchemaProcessor.js';

/**
 * Input Wrapper for most {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s.
 */
export class InputWrapper extends BaseFormSchemaProcessor<FormSchemaEntryBase> {
  constructor(
    protected entry: FormSchemaEntryBase,
    protected formData: Record<string, any>,
    private coreContent: string,
    private processor: FormSchemaEntryProcessor
  ) {
    super(entry, formData);
  }

  protected override toString(): string {
    const { chosenLabel, tooltip } = this.getCleanedEntryValues();
    const skipForAttr = ['checkbox-multiple', 'switch-multiple', 'radio'];
    const forAttr = skipForAttr.includes(this.entry.inputType!) ? '' : `for="${this.processor.uniqueId}"`;

    return `
        <div data-input-type="${this.entry.inputType}">
          <label ${forAttr} ${tooltip}>${chosenLabel}</label>
          ${this.coreContent}
        </div>
      `;
  }
}
