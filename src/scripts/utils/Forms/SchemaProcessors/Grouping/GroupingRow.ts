/**
 * FormSchemaGrouping Row Processor Definition
 *
 * @module
 */

import merge from 'lodash.merge';
import { BuildInput } from '../../Builder.js';
import { FormSchemaGroupingRow } from '../../types.js';
import { SimpleInput } from '../Inputs/SimpleInput.js';

/**
 * {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Row Processor Definition.
 *
 * A {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Processing a simple {@link utils/Forms/SchemaProcessors/Grouping/GroupingRow.GroupingRow | `GroupingRow`} of associated {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s by iteratively calling {@link utils/Forms/Builder.BuildInput | `FormBuilder::BuildInput`}.
 */
export class GroupingRow extends SimpleInput<FormSchemaGroupingRow> {
  override toString(): string {
    if (!this.entry.subSchema) {
      throw new Error('Missing `subSchema` in Entry!');
    }

    const rowEntries = this.entry.subSchema;
    // If `arrayIndex` is supplied, we generate a suffix for "array access".
    // An `arrayIndex` is expected from `GroupArray` and `GroupList`, but a `Row`
    // actually *can* be Processed individually if necessary.
    const suffix = undefined !== this.entry.arrayIndex ? `[${this.entry.arrayIndex}]` : '';

    // For each rowEntry, Build an Input, setting the name to a potential suffix'd value.
    const rowResults = rowEntries.map(rowEntry => {
      const childResults = BuildInput(
        {
          ...rowEntry,
          name: `${rowEntry.name}${suffix}`
        },
        this.formData
      );

      // Accumulate iterative results
      this.mapping = merge({}, this.mapping, childResults.mapping);

      return childResults.html;
    });

    // For each Row's of Results, wrap with HTML Table Columns for the content
    let rowContent = '';
    rowResults.forEach((content, idx) => {
      const entry = rowEntries[idx];
      rowContent += `<td data-col-type="${entry.inputType}">${content}</td>`;
    });

    // Return a Table Row...
    return `<tr>${rowContent}</tr>`;
  }
}
