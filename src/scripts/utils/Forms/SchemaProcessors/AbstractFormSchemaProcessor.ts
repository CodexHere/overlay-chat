/**
 * Abstract FormSchema Processor Definition
 *
 * @module
 */

import merge from '@fastify/deepmerge';
import { ToId } from '../../misc.js';
import {
  FormSchemaEntryBase,
  FormSchemaEntryProcessor,
  ProcessedFormSchema,
  ProcessedFormSchemaMappings
} from '../types.js';

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
  /** Running {@link ProcessedFormSchemaMappings | `ProcessedFormSchemaMappings`} for this Processor. Recursive/Iterative calls need to properly aggregate this value. */
  protected mappings: ProcessedFormSchemaMappings = { byName: {}, byType: {} };

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
    this.mappings = merge()(this.mappings, {
      byType: {
        [entry.inputType!]: {
          [entry.name]: entry
        }
      },

      byName: {
        [entry.name]: entry
      }
    }) as ProcessedFormSchemaMappings;
  }

  /**
   * Evaluate the given {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}
   * and express updated or new values for the Entry to be
   * considered for Processing output.
   */
  protected getCleanedEntryValues() {
    const chosenLabel = this.entry.label ?? this.entry.name;
    const nameOrLabelId = ToId(this.entry.name ?? this.entry.label);

    return { chosenLabel, nameOrLabelId };
  }

  /**
   * Process the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`} for both
   * HTML output and Entry Mapping.
   */
  process(): ProcessedFormSchema {
    return {
      html: this.toString(),
      mappings: this.mappings
    };
  }

  /**
   * Process the HTML Output for the {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
   */
  protected toString(): string {
    throw new Error('Must be implemented by the Concrete Forms::Element Class!');
  }
}
