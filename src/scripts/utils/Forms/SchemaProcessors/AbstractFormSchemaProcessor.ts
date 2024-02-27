/**
 * Abstract FormSchema Processor Definition
 *
 * @module
 */

import merge from 'lodash.merge';
import { FormSchemaEntryBase, FormSchemaEntryProcessor, InputTypeEntryMap, ProcessedFormSchema } from '../types.js';

/**
 * Abstract FormSchema Processor Definition.
 *
 * @typeParam SchemaEntryType - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
 */
export class AbstractFormSchemaProcessor<SchemaEntryType extends FormSchemaEntryBase>
  implements FormSchemaEntryProcessor
{
  /** Static tracking of unique label ID. */
  static labelId = 0;

  /** Instance tracking of unique label ID. */
  protected labelId: number;
  /** Running {@link InputTypeEntryMap | `InputTypeEntryMap`} for this Processor. Recursive/Iterative calls need to properly aggregate this value. */
  protected mapping: InputTypeEntryMap = {};

  /**
   * Retrieves Unique ID for this Processor.
   *
   * Generally speaking, this is used for a unique `HTMLElement` ID so
   * interactions with `<label>`s and other expected behaviors act accordingly.
   */
  get uniqueId() {
    return `${this.getCleanedEntryValues().nameOrLabelId}-${this.labelId}`;
  }

  /**
   * Creates new {@link AbstractFormSchemaProcessor | `AbstractFormSchemaProcessor`}.
   *
   * @param entry - Form Schema for the single {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
   * @typeParam SchemaEntryType - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   */
  constructor(
    protected entry: SchemaEntryType,
    protected formData: Record<string, any>
  ) {
    // Store localized unique label ID
    this.labelId = AbstractFormSchemaProcessor.labelId++;

    // Initiate the Mapping with ourself and the associative entries.
    this.mapping = merge({}, this.mapping, {
      [entry.inputType!]: {
        [entry.name]: entry
      }
    });
  }

  /**
   * Evaluate the given {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}
   * and express updated or new values for the Entry to be
   * considered for Processing output.
   */
  protected getCleanedEntryValues() {
    const chosenLabel = this.entry.label ?? this.entry.name;
    const nameOrLabelId = (this.entry.name ?? this.entry.label)?.toLocaleLowerCase().replaceAll(' ', '_');

    return { chosenLabel, nameOrLabelId };
  }

  /**
   * Process the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`} for both
   * HTML output and Entry Mapping.
   */
  process(): ProcessedFormSchema {
    return {
      html: this.toString(),
      mapping: this.mapping
    };
  }

  /**
   * Process the HTML Output for the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   */
  protected toString(): string {
    throw new Error('Must be implemented by the Concrete Forms::Element Class!');
  }
}
