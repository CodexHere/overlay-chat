import merge from 'lodash.merge';
import { SettingsSchemaCheckedMultiInput } from '../types.js';
import { CheckedInput } from './CheckedInput.js';
import { InputWrapper } from './InputWrapper.js';
import { SimpleInput } from './SimpleInput.js';

type ChildrenTypes = CheckedInput['entry']['inputType'];

export class CheckedMultiInput extends SimpleInput<SettingsSchemaCheckedMultiInput> {
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

      const childInput = new CheckedInput(childSchema, this.settings);
      const childResults = childInput.process();

      const wrapper = new InputWrapper(childSchema, this.settings, childResults.results, childInput);
      childResults.results = wrapper.process().results; // Update with new wrapped result

      // Accumulate recursive/iterative results
      outString += childResults.results;
      this.mapping = merge({}, this.mapping, childResults.mapping);
    });

    return `
      <div class="input-group">
        ${outString}
      </div>
    `;
  }
}
