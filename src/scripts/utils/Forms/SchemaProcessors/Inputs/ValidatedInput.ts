import { FormSchemaValidated } from '../../types.js';
import { SimpleInput } from './SimpleInput.js';

const PATTERN_DEFAULTS = {
  tel: '[0-9]{3}-[0-9]{3}-[0-9]{4}',
  email: '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$',
  url: ''
};

export class ValidatedInput extends SimpleInput<FormSchemaValidated> {
  protected override getCleanedEntryValues() {
    const chosenPattern = this.entries.pattern ?? PATTERN_DEFAULTS[this.entries.inputType];

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
