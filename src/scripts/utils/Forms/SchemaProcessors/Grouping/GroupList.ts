/**
 * FormSchemaGrouping List Processor Definition
 *
 * @module
 */

import { GroupingBase } from './GroupingBase.js';

/**
 * {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} List Processor Definition.
 *
 * A {@link utils/Forms/types.FormSchemaGrouping | `FormSchemaGrouping`} Processing a {@link utils/Forms/SchemaProcessors/Grouping/GroupingRow.GroupingRow | `GroupingRow`} of associated {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s, with Add/Remove (+/-) Buttons for managing the List of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}s.
 */
export class GroupList extends GroupingBase {
  protected override toString(): string {
    const { tooltip, chosenLabel, nameOrLabelId } = this.getCleanedEntryValues();
    const coreContent = super.toString();

    return `
      <details
        id="${nameOrLabelId}"
        data-input-type="${this.entry.inputType}"
      >
        <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
        <div class="content">
          ${coreContent}

          <div class="arraylist-controls" data-inputs='${JSON.stringify(this.entry.subSchema)}'>
            <button name="addentry-${nameOrLabelId}" class="add">+</button>
            <button name="delentry-${nameOrLabelId}" class="subtract">-</button>
          </div>
        </div>
    </details>
  `;
  }
}
