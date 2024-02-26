import { FormSchemaMinMax } from '../../types.js';
import { SimpleInput } from './SimpleInput.js';

export class MinMaxInput<MinMaxSchema extends FormSchemaMinMax> extends SimpleInput<MinMaxSchema> {
  protected override getCleanedEntryValues() {
    const min = this.entries.min ? `min="${this.entries.min}"` : '';
    const max = this.entries.max ? `max="${this.entries.max}"` : '';
    const step = this.entries.step ? `step="${this.entries.step}"` : '';

    return {
      ...super.getCleanedEntryValues(),
      min,
      max,
      step
    };
  }

  protected override getExtraAttributes(): string {
    const { min, max, step } = this.getCleanedEntryValues();

    return `
      ${super.getExtraAttributes()}
      ${min}
      ${max}
      ${step}
    `;
  }
}

export class RangeInput extends MinMaxInput<FormSchemaMinMax> {
  override toString(): string {
    const { min, max, step } = this.getCleanedEntryValues();

    return `
      <div class="range-wrapper">
        ${super.toString()}

        <input type="number" class="range-display" ${min} ${max} ${step}/>
      </div>
    `;
  }
}
