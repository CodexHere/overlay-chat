/**
 * Abstract FormSchema Processor Definition
 *
 * @module
 */

import merge, { Options } from '@fastify/deepmerge';
import { IsValidValue, ToId } from '../../Primitives.js';
import {
  FormSchemaEntryBase,
  FormSchemaEntryProcessor,
  MergeMode,
  NameFormSchemaEntryOverrideMap,
  ProcessedFormSchema,
  ProcessedFormSchemaMappings
} from '../types.js';

/**
 * Replaces Target Array with a Clone of the Source Array.
 *
 * @param options - deepmerge Options
 */
const ArrayReplaceStrategy: Options['mergeArray'] = options => (_target, source) => options.clone(source);

/**
 * Adds Source entries to the Target Array if they don't exist.
 *
 * @param options - deepmerge Options
 */
const ArrayUpdateStrategy: Options['mergeArray'] = options => (target, source) => {
  source.forEach(item => {
    if (false === target.includes(item)) {
      target.push(options.clone(item));
    }
  });

  return target;
};

/**
 * Abstract FormSchema Processor Definition.
 *
 * @typeParam SchemaEntryType - Subclass of {@link utils/Forms/types.FormSchemaEntry | `FormSchemaEntry`}.
 */
export abstract class AbstractFormSchemaProcessor<SchemaEntryType extends FormSchemaEntryBase>
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
   * @param entry - Supply a single {@link FormSchemaEntry | `FormSchemaEntry`} as the original from the Plugin that Registered it.
   * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
   * @param schemaOverrides - A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time.
   */
  constructor(
    protected entry: SchemaEntryType,
    protected formData: Record<string, any>,
    protected schemaOverrides?: NameFormSchemaEntryOverrideMap
  ) {
    if (false === IsValidValue(entry.name)) {
      throw new Error('FormSchemaEntry does not have a `name` property! ' + JSON.stringify(entry));
    }

    // Store localized unique label ID
    this.labelId = AbstractFormSchemaProcessor.labelId++;

    // Normalize the Entry's name, to be safe!
    entry.name = ToId(entry.name);

    // Apply overrides for the schema
    this.applySchemaOverride();

    // Initiate the Mapping with ourself and the associative entries.
    this.mappings = merge()(this.mappings, {
      byType: {
        [this.entry.inputType!]: {
          [this.entry.name]: this.entry
        }
      },

      byName: {
        [this.entry.name]: this.entry
      }
    }) as ProcessedFormSchemaMappings;
  }

  /**
   * Determines whether or not, and how, to apply merging logic to Schema overrides.
   */
  protected applySchemaOverride() {
    // Merge our partial Override with our original Entry
    if (!this.schemaOverrides || !this.schemaOverrides[this.entry.name]) {
      return;
    }

    const overrideMapping = this.schemaOverrides[this.entry.name];
    const overrideEntry = overrideMapping?.schema;

    // Our Entry is a subItem of the Override, meaning we are likely iterating on the subItem itself.
    // We want to ensure we don't falsly capture when the names are identical.
    const entryIsSubItem =
      overrideEntry?.inputType?.includes(this.entry.inputType ?? 'shouldneverbefound') &&
      overrideEntry?.inputType !== this.entry.inputType;

    // Override `inputType` doesn't match original `inputType`
    // Also, we want to make sure this isn't a "multiple" item, as the way naming
    // works there is funky, and will give false errors here when rendering sub-items.
    if (overrideEntry!.inputType !== this.entry.inputType && false === entryIsSubItem) {
      console.warn(
        `FormSchemaEntry Override for ${this.entry.name} have mismatched inputTypes (${overrideEntry!.inputType} != ${this.entry.inputType}). Cannot use the Override!`,
        this.entry,
        overrideEntry
      );
    } else {
      const mergeOpts = {
        [MergeMode.ArrayUpdate]: { mergeArray: ArrayUpdateStrategy },
        [MergeMode.ArrayReplace]: { mergeArray: ArrayReplaceStrategy },
        [MergeMode.ArrayConcat]: {}
      }[overrideMapping?.mergeMode ?? MergeMode.ArrayConcat];

      // `inputType` does match, merge them
      this.entry = merge(mergeOpts)(this.entry, overrideEntry) as SchemaEntryType;
    }
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
