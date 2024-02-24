import { SettingsSchemaMinMax } from '../types.js';
import { SimpleInput } from './SimpleInput.js';

export class MinMaxInput<MinMaxSchema extends SettingsSchemaMinMax> extends SimpleInput<MinMaxSchema> {
  protected override getCleanedEntryValues() {
    const min = this.entry.min ? `min="${this.entry.min}"` : '';
    const max = this.entry.max ? `max="${this.entry.max}"` : '';
    const step = this.entry.step ? `step="${this.entry.step}"` : '';

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

export class RangeInput extends MinMaxInput<SettingsSchemaMinMax> {
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
