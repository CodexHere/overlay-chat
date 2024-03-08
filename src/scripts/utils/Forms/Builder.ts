/**
 * Form Builder Utility
 *
 * @module
 */

import merge from '@fastify/deepmerge';
import { Form } from './SchemaProcessors/Form.js';
import { GroupArray } from './SchemaProcessors/Grouping/GroupArray.js';
import { GroupList } from './SchemaProcessors/Grouping/GroupList.js';
import { GroupSubSchema } from './SchemaProcessors/Grouping/GroupSubSchema.js';
import { InputWrapper } from './SchemaProcessors/InputWrapper.js';
import { Button } from './SchemaProcessors/Inputs/Button.js';
import { CheckedInput } from './SchemaProcessors/Inputs/CheckedInput.js';
import { CheckedMultiInput } from './SchemaProcessors/Inputs/CheckedMultiInput.js';
import { MinMaxInput, RangeInput } from './SchemaProcessors/Inputs/MinMaxInput.js';
import { PasswordInput } from './SchemaProcessors/Inputs/PasswordInput.js';
import { SelectInput } from './SchemaProcessors/Inputs/SelectInput.js';
import { SimpleInput } from './SchemaProcessors/Inputs/SimpleInput.js';
import { ValidatedInput } from './SchemaProcessors/Inputs/ValidatedInput.js';
import {
  FormSchema,
  FormSchemaEntry,
  FormSchemaEntryProcessorConstructor,
  NameFormSchemaEntryOverrideMap,
  ProcessedFormSchema
} from './types.js';

/**
 * Builds a single Input from a single {@link FormSchemaEntry | `FormSchemaEntry`}.
 *
 * @param entry - Supply a single {@link FormSchemaEntry | `FormSchemaEntry`} as the original from the Plugin that Registered it.
 * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
 * @param schemaOverrides - A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time.
 * @typeParam FormData - Shape of the Data that can populate the Form.
 */
export const BuildInput = <FormData extends {}>(
  entry: FormSchemaEntry,
  formData: FormData,
  schemaOverrides?: NameFormSchemaEntryOverrideMap
): ProcessedFormSchema => {
  let processorCtor: FormSchemaEntryProcessorConstructor | undefined;

  /**
   * SchemaProcessor Selection
   *
   * Selects a Class (aka Constructor) to Instantiate and process polymorphically.
   */
  switch (entry.inputType) {
    // Button
    case 'button':
      processorCtor = Button as FormSchemaEntryProcessorConstructor;
      break;

    // PasswordInput
    case 'password':
      processorCtor = PasswordInput as FormSchemaEntryProcessorConstructor;
      break;

    // SimpleInput
    case 'color':
    case 'file':
    case 'hidden':
    case 'search':
    case 'text':
      processorCtor = SimpleInput as FormSchemaEntryProcessorConstructor;
      break;

    // CheckedInput
    case 'radio-option':
    case 'switch':
    case 'checkbox':
      processorCtor = CheckedInput as FormSchemaEntryProcessorConstructor;
      break;

    // ValidatedInput
    case 'email':
    case 'tel':
    case 'url':
      processorCtor = ValidatedInput as FormSchemaEntryProcessorConstructor;
      break;

    // RangeInput | MinMaxInput
    case 'range':
    case 'number':
    case 'date':
    case 'datetime-local':
    case 'month':
    case 'time':
    case 'week':
      const minMaxInput = 'range' === entry.inputType ? RangeInput : MinMaxInput;
      processorCtor = minMaxInput as FormSchemaEntryProcessorConstructor;
      break;

    // CheckedMultiInput
    case 'radio':
    case 'checkbox-multiple':
    case 'switch-multiple':
      processorCtor = CheckedMultiInput as unknown as FormSchemaEntryProcessorConstructor;
      break;

    // SelectInput
    case 'select':
    case 'select-multiple':
      processorCtor = SelectInput as unknown as FormSchemaEntryProcessorConstructor;
      break;

    // Grouping
    case 'group-subschema':
    case 'grouplist':
    case 'grouparray':
      const groupCtor = {
        grouparray: GroupArray,
        grouplist: GroupList,
        'group-subschema': GroupSubSchema
      }[entry.inputType];

      processorCtor = groupCtor as unknown as FormSchemaEntryProcessorConstructor;
      break;

    // noop - This is required or Typescript complains about the case in the
    // following `switch` block not being a matching type.
    case 'grouprow':
      break;

    // Invalid InputType!
    default:
      const brokenItem = entry as any;
      throw new Error(
        `Invalid FormSchemaEntry::inputType in Schema for "${brokenItem.name ?? brokenItem.label}": ${brokenItem.inputType}`
      );
  }

  // Instantiate and Process!
  const processor = new processorCtor!(entry, formData, schemaOverrides);
  const processed = processor.process();

  /**
   * Label Wrapping.
   *
   * Some FormSchemaEntry types require an InputWrapper, the rest noop.
   */
  switch (entry.inputType) {
    case 'button':
    case 'group-subschema':
    case 'grouplist':
    case 'grouparray':
    case 'grouprow':
      // noop
      break;

    default:
      const wrapper = new InputWrapper(entry, processed, processor);
      // Update the `processed` HTML results with the newly wrapped HTML
      // Note: No need to merge `mapping` as the `InputWrapper` provides zero mapping.
      processed.html = wrapper.process().html;
      break;
  }

  // Accumulate iterative results
  return processed;
};

/**
 * Builds an entire {@link FormSchema | `FormSchema`} of Inputs.
 *
 * > NOTE: This is effectively the internals of a `<form>` Element.
 *
 * @param entries - Collection of {@link FormSchemaEntry | `FormSchemaEntry`}s to build as an entire {@link FormSchema | `FormSchema`}.
 * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
 * @param schemaOverrides - A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time.
 */
export const BuildFormSchema = <FormData extends {}>(
  entries: Readonly<FormSchema>,
  formData: FormData,
  schemaOverrides?: NameFormSchemaEntryOverrideMap
): ProcessedFormSchema => {
  let results: ProcessedFormSchema = { html: '', mappings: { byName: {}, byType: {} } };

  // Build every `entry` in `entries`
  for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
    const entryOriginal = entries[entryIdx];
    const newInput = BuildInput(entryOriginal, formData, schemaOverrides);

    // Accumulate iterative results
    results = merge({ all: true })(results, newInput, {
      html: results.html + newInput.html
    });
  }

  return results;
};

/**
 * Builds an entire {@link FormSchema | `FormSchema`} of Inputs, and wraps with an `HTMLFormElement` tag (`<form>`) with associative `formId`.
 *
 * @param entries - Collection of {@link FormSchemaEntry | `FormSchemaEntry`}s to build as an entire {@link FormSchema | `FormSchema`}.
 * @param schemaOverrides - A {@link NameFormSchemaEntryOverrideMap | `NameFormSchemaEntryOverrideMap`} for overriding FormSchemaEntry's at Build-time.
 * @param formData - Form Data to evaluate for {@link utils/Forms/types.FormSchemaGrouping | Grouping} Schema Entries.
 * @param formId - Unique ID to give the `HTMLFormElement` when Processed.
 */
export const BuildForm = <FormData extends {}>(
  entries: Readonly<FormSchema>,
  schemaOverrides: NameFormSchemaEntryOverrideMap,
  formData: FormData,
  formId: string
): Form => {
  return new Form(entries, formData, formId, schemaOverrides);
};
