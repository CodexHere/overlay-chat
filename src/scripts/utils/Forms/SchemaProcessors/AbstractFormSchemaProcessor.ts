import merge from 'lodash.merge';
import { FormSchemaEntryBase, FormSchemaEntryProcessor, InputTypeEntryMap, ProcessedFormSchema } from '../types.js';

export class AbstractFormSchemaProcessor<SchemaEntryType extends FormSchemaEntryBase>
  implements FormSchemaEntryProcessor
{
  static labelId = 0;

  protected labelId: number;
  protected mapping: InputTypeEntryMap = {};

  get uniqueId() {
    return `${this.getCleanedEntryValues().nameOrLabelId}-${this.labelId}`;
  }

  constructor(
    protected entries: SchemaEntryType,
    protected formData: Record<string, any>
  ) {
    this.labelId = AbstractFormSchemaProcessor.labelId++;
    this.mapping = merge({}, this.mapping, {
      [entries.inputType!]: {
        [entries.name]: entries
      }
    });
  }

  protected getCleanedEntryValues() {
    const chosenLabel = this.entries.label ?? this.entries.name;
    const nameOrLabelId = (this.entries.name ?? this.entries.label)?.toLocaleLowerCase().replaceAll(' ', '_');

    return { chosenLabel, nameOrLabelId };
  }

  process(): ProcessedFormSchema {
    return {
      html: this.toString(),
      mapping: this.mapping
    };
  }

  protected toString(): string {
    throw new Error('Must be implemented by the Concrete Forms::Element Class!');
  }
}
