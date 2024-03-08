/**
 * FormSchemaGrouping Row Processor Definition
 *
 * @module
 */

import merge from '@fastify/deepmerge';
import { BuildFormSchemaEntry } from '../../Builder.js';
import { FormSchemaGroupingRow, NameFormSchemaEntryOverrideMap } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

/**
 * {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Row Processor Definition.
 *
 * A {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Processing a simple {@link utils/Forms/SchemaProcessors/Grouping/GroupingRow.GroupingRow | `GroupingRow`} of associated {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s by iteratively calling {@link utils/Forms/Builder.BuildInput | `FormBuilder::BuildInput`}.
 */
export class GroupingRow extends BaseFormSchemaProcessor<FormSchemaGroupingRow> {
  constructor(
    entry: FormSchemaGroupingRow,
    formData: Record<string, any>,
    schemaOverrides?: NameFormSchemaEntryOverrideMap
  ) {
    if (!entry.subSchema) {
      throw new Error('Missing `subSchema` in Entry!');
    }

    super(entry, formData, schemaOverrides);
  }

  override toString(): string {
    const rowEntries = this.entry.subSchema;
    // If `arrayIndex` is supplied, we generate a suffix for "array access".
    // An `arrayIndex` is expected from `GroupArray` and `GroupList`, but a `Row`
    // actually *can* be Processed individually if necessary.
    const suffix = undefined !== this.entry.arrayIndex ? `[${this.entry.arrayIndex}]` : '';

    // For each rowEntry, Build an Input, setting the name to a potential suffix'd value.
    const rowResults = rowEntries.map(rowEntry => {
      const childResults = BuildFormSchemaEntry(
        {
          ...rowEntry,
          name: `${rowEntry.name}${suffix}`
        },
        this.formData,
        this.schemaOverrides
      );

      // Accumulate iterative results
      this.mappings = merge()(this.mappings, childResults.mappings);

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
