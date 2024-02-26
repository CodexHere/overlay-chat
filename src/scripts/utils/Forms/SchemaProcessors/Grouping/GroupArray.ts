import { GroupingBase } from './Grouping.js';

export class GroupArray extends GroupingBase {
  protected override toString(): string {
    const { tooltip, chosenLabel, nameOrLabelId } = this.getCleanedEntryValues();
    const coreContent = super.toString();

    return `
      <div
        id="${nameOrLabelId}" 
        data-input-type="${this.entries.inputType}"
      >
      <div class="label-wrapper" ${tooltip}>${chosenLabel}</div>
      ${coreContent}
    </div>
  `;
  }
}
