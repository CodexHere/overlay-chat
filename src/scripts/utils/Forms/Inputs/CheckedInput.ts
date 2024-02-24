import { SettingsSchemaCheckedInput } from '../types.js';
import { SimpleInput } from './SimpleInput.js';

export class CheckedInput extends SimpleInput<SettingsSchemaCheckedInput> {
  // > NOTE: We don't call `super()` and use our own evaluation of the `inputType` value.
  protected override getExtraAttributes() {
    const { defaultData } = this.getCleanedEntryValues();
    const inputType = this.entry.inputType === 'radio-option' ? 'radio' : 'checkbox';
    const switchRole = this.entry.inputType === 'switch' ? 'role="switch"' : '';

    return `
      type="${inputType}"
      ${switchRole}
      ${defaultData ? 'checked' : ''}
    `;
  }
}
