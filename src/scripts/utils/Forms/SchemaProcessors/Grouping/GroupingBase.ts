/**
 * Base Grouping Processor Definition
 *
 * @module
 */

import merge from 'lodash.merge';
import { FormSchemaGrouping } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';
import { GroupingRow } from './GroupingRow.js';

/**
 * Base Grouping Processor Definition.
 *
 * A Grouping can generally be considered an entire rendering of a Sub Schema,
 * however they are handled slightly different, based on the *type* of Grouping.
 */
export class GroupingBase extends BaseFormSchemaProcessor<FormSchemaGrouping> {
  /**
   * Evaluates the supplied FormData to determine the number of
   * Entries in our Group.
   */
  private getNumValues(): number {
    const rowEntries = this.entry.subSchema;
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
    if (!this.entry.subSchema) {
      throw new Error('Missing `subSchema` in Entry!');
    }

    const entry = this.entry;
    const isList = 'grouplist' === entry.inputType;
    const numValues = this.getNumValues();
    const description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

    // Iterate and build entire Row of FormSchemaEntry's, `numValues`-times
    // to account for deserialized data.
    const groupingRowResults = Array(numValues)
      .fill(0)
      .map((_empty, settingIdx) => {
        const childInput = new GroupingRow(
          {
            inputType: 'grouprow',
            name: 'grouprow',
            arrayIndex: isList ? settingIdx : undefined,
            subSchema: entry.subSchema
          },
          this.formData
        );

        const childResults = childInput.process();
        this.mapping = merge({}, this.mapping, childResults.mapping);
        return childResults.html;
      });

    // Create Headers of Table based on Label/Name of `FormSchemaEntry`
    const headers = entry.subSchema.reduce(
      (out, formSchema) => `
        ${out}
        <th data-col-type="${formSchema.inputType}">
          ${formSchema.label ?? formSchema.name}
        </th>
      `,
      ''
    );

    // Complete the Table structure
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

    // Supply Description (if one), and wrap TableData for responsiveness
    return `
      ${description}

      <div class="table-wrapper">
        ${tableData}
      </div>
    `;
  }
}
