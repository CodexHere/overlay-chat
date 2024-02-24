import { Grouping } from './Grouping.js';

export class GroupArray extends Grouping {
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
