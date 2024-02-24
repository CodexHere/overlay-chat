import merge from 'lodash.merge';
import { FromJson } from '../index.js';
import { SettingsSchemaGrouping } from '../types.js';
import { BaseSettingsSchemaProcessor } from './BaseSettingsSchemaProcessor.js';

export class GroupSubSchema extends BaseSettingsSchemaProcessor<SettingsSchemaGrouping> {
  protected override toString(): string {
    const { nameOrLabelId, tooltip, chosenLabel } = this.getCleanedEntryValues();
    const description =
      this.entry.description ? `<blockquote class="description">${this.entry.description}</blockquote>` : '';
    const subSchemaResults = FromJson(this.entry.values, this.settings);

    this.mapping = merge({}, this.mapping, subSchemaResults.mapping);

    return `
      <details
        id="${nameOrLabelId}"
        data-input-type="${this.entry.inputType}"
      >
        <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
        <div class="content">
          ${description}
          ${subSchemaResults.results}
        </div>
      </details>
      `;
  }
}
