import { GroupingBase } from './Grouping.js';

export class GroupList extends GroupingBase {
  protected override toString(): string {
    const { tooltip, chosenLabel, nameOrLabelId } = this.getCleanedEntryValues();
    const coreContent = super.toString();

    return `
      <details
        id="${nameOrLabelId}"
        data-input-type="${this.entries.inputType}"
      >
        <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
        <div class="content">
          ${coreContent}

          <div class="arraylist-controls" data-inputs='${JSON.stringify(this.entries.values)}'>
            <button name="addentry-${nameOrLabelId}" class="add">+</button>
            <button name="delentry-${nameOrLabelId}" class="subtract">-</button>
          </div>
        </div>
    </details>
  `;
  }
}
