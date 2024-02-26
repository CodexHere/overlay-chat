/**
 * FormSchemaCheckedMultiInput Processor
 *
 * @module
 */

import merge from 'lodash.merge';
import { FormSchemaCheckedMultiInput } from '../../types.js';
import { InputWrapper } from '../InputWrapper.js';
import { CheckedInput } from './CheckedInput.js';
import { SimpleInput } from './SimpleInput.js';

type ChildrenTypes = CheckedInput['entry']['inputType'];

/**
 * {@link FormSchemaCheckedMultiInput | `FormSchemaCheckedMultiInput`} Processor.
 *
 * Outputs collection of {@link CheckedInput | `CheckedInput`}s.
 */
export class CheckedMultiInput extends SimpleInput<FormSchemaCheckedMultiInput> {
  override toString(): string {
    let outString = '';

    // Normalize the `inputType to `radio-option` | `checkbox` | `switch`
    // prettier-ignore
    const childInputType: ChildrenTypes = 
      'radio' === this.entry.inputType ? 
        'radio-option' 
        : this.entry.inputType.replace('-multiple', '') as ChildrenTypes;

    // Iterate over all `values` and build children inputs based on the desired `inputType`.
    this.entry.values.forEach(checkValue => {
      const childSchema = {
        name: this.entry.name,
        label: checkValue,
        inputType: childInputType
      };

      // Create individual `CheckedInput` and Wrap it!
      const childInput = new CheckedInput(childSchema, this.formData);
      const childResults = childInput.process();

      const wrapper = new InputWrapper(childSchema, this.formData, childResults.html, childInput);
      childResults.html = wrapper.process().html; // Update with new wrapped result

      // Accumulate recursive/iterative results
      outString += childResults.html;
      this.mapping = merge({}, this.mapping, childResults.mapping);
    });

    return `
      <div class="input-group">
        ${outString}
      </div>
    `;
  }
}
