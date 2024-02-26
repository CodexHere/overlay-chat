import merge from 'lodash.merge';
import { BuildFormSchema } from '../../Builder.js';
import { FormSchemaGrouping } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

export class GroupSubSchema extends BaseFormSchemaProcessor<FormSchemaGrouping> {
  protected override toString(): string {
    const { nameOrLabelId, tooltip, chosenLabel } = this.getCleanedEntryValues();
    const description =
      this.entries.description ? `<blockquote class="description">${this.entries.description}</blockquote>` : '';
    const subSchemaResults = BuildFormSchema(this.entries.values, this.formData);

    this.mapping = merge({}, this.mapping, subSchemaResults.mapping);

    return `
      <details
        id="${nameOrLabelId}"
        data-input-type="${this.entries.inputType}"
      >
        <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
        <div class="content">
          ${description}
          ${subSchemaResults.html}
        </div>
      </details>
      `;
  }
}
