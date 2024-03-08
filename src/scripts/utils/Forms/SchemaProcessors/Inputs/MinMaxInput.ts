/**
 * FormSchemaMinMax Processors
 *
 * @module
 */

import { FormSchemaMinMax } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';

/**
 * {@link FormSchemaMinMax | `FormSchemaMinMax`} Processor.
 *
 * Outputs an Input Type that supports Min/Max/Step attributes (i.e., Date, Number, Range, etc).
 *
 * @typeDev MinMaxSchema - Scheme Type that extends {@link FormSchemaMinMax | `FormSchemaMinMax`}.
 */
export class MinMaxInput<MinMaxSchema extends FormSchemaMinMax> extends BaseFormSchemaProcessor<MinMaxSchema> {
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

/**
 * {@link FormSchemaMinMax | `FormSchemaMinMax`} Processor.
 *
 * Outputs an Input for Range, as well as a "Range Display" for UX interactions.
 */
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
