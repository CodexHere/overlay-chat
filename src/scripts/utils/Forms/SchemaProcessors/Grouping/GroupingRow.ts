import merge from 'lodash.merge';
import { BuildInput } from '../../Builder.js';
import { FormSchemaGroupingRow } from '../../types.js';
import { SimpleInput } from '../Inputs/SimpleInput.js';

export class GroupingRow extends SimpleInput<FormSchemaGroupingRow> {
  override toString(): string {
    const rowEntries = this.entries.values;
    // `this.entry.label` identifies array index access
    const suffix = undefined !== this.entries.arrayIndex ? `[${this.entries.arrayIndex}]` : '';

    const rowResults = rowEntries.map(rowEntry => {
      const childResults = BuildInput(
        {
          ...rowEntry,
          name: `${rowEntry.name}${suffix}`
        },
        this.formData
      );

      this.mapping = merge({}, this.mapping, childResults.mapping);

      return childResults.html;
    });

    let rowContent = '';
    rowResults.forEach((content, idx) => {
      const entry = rowEntries[idx];
      rowContent += `<td data-col-type="${entry.inputType}">${content}</td>`;
    });

    return `<tr>${rowContent}</tr>`;
  }
}
