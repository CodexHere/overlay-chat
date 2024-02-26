/**
 * FormSchemaGrouping Sub-Schema Processor Definition
 *
 * @module
 */

import merge from 'lodash.merge';
import { BuildFormSchema } from '../../Builder.js';
import { FormSchemaGrouping } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

/**
 * {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Sub-Schema Processor Definition.
 *
 * A {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Processing a {@link utils/Forms/types.FormSchema | `FormSchema`} by recursively calling {@link utils/Forms/Builder.BuildInput | `FormBuilder::BuildInput`} as necessary.
 */
export class GroupSubSchema extends BaseFormSchemaProcessor<FormSchemaGrouping> {
  protected override toString(): string {
    if (!this.entry.subSchema) {
      throw new Error('Missing `subSchema` in Entry!');
    }

    const { nameOrLabelId, tooltip, chosenLabel } = this.getCleanedEntryValues();
    const description =
      this.entry.description ? `<blockquote class="description">${this.entry.description}</blockquote>` : '';
    const subSchemaResults = BuildFormSchema(this.entry.subSchema, this.formData);

    this.mapping = merge({}, this.mapping, subSchemaResults.mapping);

    return `
      <details
        id="${nameOrLabelId}"
        data-input-type="${this.entry.inputType}"
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
