import merge from 'lodash.merge';
import { FromJson } from '../index.js';
import { SettingsSchemaGroupingRow } from '../types.js';
import { SimpleInput } from './SimpleInput.js';

export class GroupingRow extends SimpleInput<SettingsSchemaGroupingRow> {
  override toString(): string {
    const rowEntries = this.entry.values;
    // `this.entry.label` identifies array index access
    const suffix = undefined !== this.entry.arrayIndex ? `[${this.entry.arrayIndex}]` : '';

    const rowResults = rowEntries.map(rowEntry => {
      const childResults = FromJson(
        [
          {
            ...rowEntry,
            name: `${rowEntry.name}${suffix}`
          }
        ],
        this.settings
      );

      this.mapping = merge({}, this.mapping, childResults.mapping);

      return childResults.results;
    });

    let rowContent = '';
    rowResults.forEach((content, idx) => {
      const entry = rowEntries[idx];
      rowContent += `<td data-col-type="${entry.inputType}">${content}</td>`;
    });

    return `<tr>${rowContent}</tr>`;
  }
}
