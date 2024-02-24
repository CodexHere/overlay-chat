import { SettingsSchemaValidated } from '../types.js';
import { SimpleInput } from './SimpleInput.js';

const PATTERN_DEFAULTS = {
  tel: '[0-9]{3}-[0-9]{3}-[0-9]{4}',
  email: '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$',
  url: ''
};

export class ValidatedInput extends SimpleInput<SettingsSchemaValidated> {
  protected override getCleanedEntryValues() {
    const chosenPattern = this.entry.pattern ?? PATTERN_DEFAULTS[this.entry.inputType];

    return {
      ...super.getCleanedEntryValues(),
      chosenPattern
    };
  }

  protected override getExtraAttributes = () => {
    const { chosenPattern } = this.getCleanedEntryValues();
    const pattern = chosenPattern ? `pattern="${chosenPattern}"` : '';

    return super.getExtraAttributes() + pattern;
  };
}
