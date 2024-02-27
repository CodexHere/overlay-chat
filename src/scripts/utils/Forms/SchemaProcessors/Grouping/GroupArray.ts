/**
 * FormSchemaGrouping Array Processor Definition
 *
 * @module
 */

import { GroupingBase } from './GroupingBase.js';

/**
 * {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Array Processor Definition.
 *
 * A {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Processing a simple {@link utils/Forms/SchemaProcessors/Grouping/GroupingRow.GroupingRow | `GroupingRow`} of associated {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s.
 */
export class GroupArray extends GroupingBase {
  protected override toString(): string {
    const { tooltip, chosenLabel, nameOrLabelId } = this.getCleanedEntryValues();
    const coreContent = super.toString();

    return `
      <div
        id="${nameOrLabelId}" 
        data-input-type="${this.entry.inputType}"
      >
      <div class="label-wrapper" ${tooltip}>${chosenLabel}</div>
      ${coreContent}
    </div>
  `;
  }
}
