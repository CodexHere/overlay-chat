import merge from 'lodash.merge';
import { SettingsSchemaGrouping } from '../types.js';
import { BaseSettingsSchemaProcessor } from './BaseSettingsSchemaProcessor.js';
import { GroupingRow } from './GroupingRow.js';

export class Grouping extends BaseSettingsSchemaProcessor<SettingsSchemaGrouping> {
  private getNumSettings(): number {
    const rowEntries = this.entry.values;
    // Get all the Entry Names of the Entries in our Row
    const groupParamNames = rowEntries.map(fe => fe.name);

    // For every Input's Name, keep track of the max number of supplied settings...
    // This will be the number of Rows we need to generate to `Process()`
    return groupParamNames.reduce((maxCount, paramName) => {
      const paramVal = this.settings[paramName];
      const settingsCount = Array.isArray(paramVal) ? paramVal.length : 1;

      return Math.max(maxCount, settingsCount);
    }, 0);
  }

  protected override toString(): string {
    const entry = this.entry;
    const isList = 'grouplist' === entry.inputType;
    const numSettings = this.getNumSettings();
    const description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

    const groupingRowResults = Array(numSettings)
      .fill(0)
      .map((_empty, settingIdx) => {
        const childInput = new GroupingRow(
          {
            inputType: 'grouprow',
            name: 'grouprow',
            arrayIndex: isList ? settingIdx : undefined,
            values: entry.values
          },
          this.settings
        );

        const childResults = childInput.process();
        this.mapping = merge({}, this.mapping, childResults.mapping);
        return childResults.results;
      });

    const headers = entry.values.reduce(
      (out, settingsSchema) => `
        ${out}
        <th data-col-type="${settingsSchema.inputType}">
          ${settingsSchema.label ?? settingsSchema.name}
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
