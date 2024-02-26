import { FormSchemaCheckedInput } from '../../types.js';
import { SimpleInput } from './SimpleInput.js';

export class CheckedInput extends SimpleInput<FormSchemaCheckedInput> {
  // > NOTE: We don't call `super()` and use our own evaluation of the `inputType` value.
  protected override getExtraAttributes() {
    const { defaultData, chosenLabel } = this.getCleanedEntryValues();
    const inputType = this.entries.inputType === 'radio-option' ? 'radio' : 'checkbox';
    const switchRole = this.entries.inputType === 'switch' ? 'role="switch"' : '';

    return `
      type="${inputType}"
      value="${chosenLabel}"
      ${switchRole}
      ${defaultData ? 'checked' : ''}
    `;
  }
}
