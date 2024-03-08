/**
 * FormSchemaValidated Processor
 *
 * @module
 */

import { FormSchemaValidated } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

// TODO: Need to validate these regex patterns are "fool-proof"
const PATTERN_DEFAULTS = {
  tel: '[0-9]{3}-[0-9]{3}-[0-9]{4}',
  email: '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$',
  url: ''
};

/**
 * {@link FormSchemaValidated | `FormSchemaValidated`} Processor.
 *
 * Outputs an Input Type that supports the `pattern` attribute (i.e., Email, Telephone, URL, etc).
 */
export class ValidatedInput extends BaseFormSchemaProcessor<FormSchemaValidated> {
  protected override getCleanedEntryValues() {
    const chosenPattern = this.entry.pattern ?? PATTERN_DEFAULTS[this.entry.inputType];

    return {
      ...super.getCleanedEntryValues(),
      chosenPattern
    };
  }

  protected override getExtraAttributes = () => {
    const { chosenPattern } = this.getCleanedEntryValues();
    const pattern = chosenPattern ? ` pattern="${chosenPattern}" ` : '';

    return super.getExtraAttributes() + pattern;
  };
}
