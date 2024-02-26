import merge from 'lodash.merge';
import { FormSchemaGrouping } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';
import { GroupingRow } from './GroupingRow.js';

export class GroupingBase extends BaseFormSchemaProcessor<FormSchemaGrouping> {
  private getNumValues(): number {
    const rowEntries = this.entries.values;
    // Get all the Entry Names of the Entries in our Row
    const groupParamNames = rowEntries.map(fe => fe.name);

    // For every Input's Name, keep track of the max number of supplied sevaluesttings...
    // This will be the number of Rows we need to generate to `Process()`
    return groupParamNames.reduce((maxCount, paramName) => {
      const paramVal = this.formData[paramName];
      const valuesCount = Array.isArray(paramVal) ? paramVal.length : 1;

      return Math.max(maxCount, valuesCount);
    }, 0);
  }

  protected override toString(): string {
    const entry = this.entries;
    const isList = 'grouplist' === entry.inputType;
    const numValues = this.getNumValues();
    const description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

    const groupingRowResults = Array(numValues)
      .fill(0)
      .map((_empty, settingIdx) => {
        const childInput = new GroupingRow(
          {
            inputType: 'grouprow',
            name: 'grouprow',
            arrayIndex: isList ? settingIdx : undefined,
            values: entry.values
          },
          this.formData
        );

        const childResults = childInput.process();
        this.mapping = merge({}, this.mapping, childResults.mapping);
        return childResults.html;
      });

    const headers = entry.values.reduce(
      (out, formSchema) => `
        ${out}
        <th data-col-type="${formSchema.inputType}">
          ${formSchema.label ?? formSchema.name}
        </th>
      `,
      ''
    );

    const tableData = `
      <table>
        <thead>
          <tr>${headers}</tr>
        </thead>
        <tbody>
          ${groupingRowResults.join('')}
        </tbody>
      </table>
    `;

    return `
      ${description}

      <div class="table-wrapper">
        ${tableData}
      </div>
    `;
  }
}
