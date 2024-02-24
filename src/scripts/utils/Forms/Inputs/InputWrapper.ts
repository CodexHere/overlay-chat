import { SettingsSchemaEntryBase, SettingsSchemaProcessor } from '../types.js';
import { BaseSettingsSchemaProcessor } from './BaseSettingsSchemaProcessor.js';

export class InputWrapper extends BaseSettingsSchemaProcessor<SettingsSchemaEntryBase> {
  constructor(
    protected entry: SettingsSchemaEntryBase,
    protected settings: Record<string, any>,
    private coreContent: string,
    private processor: SettingsSchemaProcessor
  ) {
    super(entry, settings);
  }

  protected override toString(): string {
    const { chosenLabel, tooltip } = this.getCleanedEntryValues();
    const skipForAttr = ['checkbox-multiple', 'switch-multiple', 'radio'];
    const forAttr = skipForAttr.includes(this.entry.inputType!) ? '' : `for="${this.processor.uniqueId}"`;

    return `
        <div data-input-type="${this.entry.inputType}">
          <label ${forAttr} ${tooltip}>${chosenLabel}</label>
          ${this.coreContent}
        </div>
      `;
  }
}
