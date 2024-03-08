/**
 * FormSchemaCheckedInput Processor
 *
 * @module
 */

import { FormSchemaCheckedInput } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

const SWITCH_TYPES = ['switch', 'switch-multiple'];

/**
 * {@link FormSchemaCheckedInput | `FormSchemaCheckedInput`} Processor.
 *
 * Outputs HTML Input Tag with Checkbox/Radio Type, and `role=switch` for Switch type.
 */
export class CheckedInput extends BaseFormSchemaProcessor<FormSchemaCheckedInput> {
  // > NOTE: We don't call `super()` and use our own evaluation of the `inputType` value.
  protected override getExtraAttributes() {
    const { defaultData, chosenLabel } = this.getCleanedEntryValues();
    const inputType = this.entry.inputType === 'radio-option' ? 'radio' : 'checkbox';
    const switchRole = SWITCH_TYPES.includes(this.entry.inputType) ? 'role="switch"' : '';

    return `
      type="${inputType}"
      value="${chosenLabel}"
      ${switchRole}
      ${defaultData ? 'checked' : ''}
    `;
  }
}
