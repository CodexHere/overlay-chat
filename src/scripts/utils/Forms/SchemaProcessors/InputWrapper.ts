import { FormSchemaEntryBase, FormSchemaEntryProcessor } from '../types.js';
import { BaseFormSchemaProcessor } from './BaseFormSchemaProcessor.js';

export class InputWrapper extends BaseFormSchemaProcessor<FormSchemaEntryBase> {
  constructor(
    protected entries: FormSchemaEntryBase,
    protected formData: Record<string, any>,
    private coreContent: string,
    private processor: FormSchemaEntryProcessor
  ) {
    super(entries, formData);
  }

  protected override toString(): string {
    const { chosenLabel, tooltip } = this.getCleanedEntryValues();
    const skipForAttr = ['checkbox-multiple', 'switch-multiple', 'radio'];
    const forAttr = skipForAttr.includes(this.entries.inputType!) ? '' : `for="${this.processor.uniqueId}"`;

    return `
        <div data-input-type="${this.entries.inputType}">
          <label ${forAttr} ${tooltip}>${chosenLabel}</label>
          ${this.coreContent}
        </div>
      `;
  }
}
