import merge from 'lodash.merge';
import { ProcessedJsonMap, ProcessedJsonResults, SettingsSchemaEntryBase, SettingsSchemaProcessor } from '../types.js';

export class AbstractSettingsSchemaProcessor<SchemaEntryType extends SettingsSchemaEntryBase>
  implements SettingsSchemaProcessor
{
  static labelId = 0;

  protected labelId: number;
  protected mapping: ProcessedJsonMap = {};

  get uniqueId() {
    return `${this.getCleanedEntryValues().nameOrLabelId}-${this.labelId}`;
  }

  constructor(
    protected entry: SchemaEntryType,
    protected settings: Record<string, any>
  ) {
    this.labelId = AbstractSettingsSchemaProcessor.labelId++;
    this.mapping = merge({}, this.mapping, {
      [entry.inputType!]: {
        [entry.name]: entry
      }
    });
  }

  protected getCleanedEntryValues() {
    const chosenLabel = this.entry.label ?? this.entry.name;
    const nameOrLabelId = (this.entry.name ?? this.entry.label)?.toLocaleLowerCase().replaceAll(' ', '_');

    return { chosenLabel, nameOrLabelId };
  }

  process(): ProcessedJsonResults {
    return {
      results: this.toString(),
      mapping: this.mapping
    };
  }

  protected toString(): string {
    throw new Error('Must be implemented by the Concrete Forms::Element Class!');
  }
}
