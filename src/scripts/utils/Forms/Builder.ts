import merge from 'lodash.merge';
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
import { FormSchema, FormSchemaEntry, FormSchemaEntryProcessorConstructor, ProcessedFormSchema } from './types.js';

export const BuildInput = <FormData extends {}>(entry: FormSchemaEntry, formdata: FormData): ProcessedFormSchema => {
  if (!entry.name) {
    throw new Error('FormEntry does not have a `name` property! ' + JSON.stringify(entry));
  }

  let processorCtor: FormSchemaEntryProcessorConstructor | undefined;

  /**
   * FormSchema Processor Selection
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

  const processor = new processorCtor!(entry, formdata);
  const processed = processor.process();

  /**
   * Label Wrapping
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
      const wrapper = new InputWrapper(entry, formdata, processed.html, processor);
      processed.html = wrapper.process().html;
      break;
  }

  // Accumulate iterative results
  return processed;
};

export const BuildFormSchema = <FormData extends {}>(
  entries: Readonly<FormSchema>,
  formData: FormData
): ProcessedFormSchema => {
  let results: ProcessedFormSchema = {
    html: '',
    mapping: {}
  } as ProcessedFormSchema;

  for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
    const entry = entries[entryIdx];

    const newInput = BuildInput(entry, formData);

    // Accumulate iterative results
    results = merge({}, results, {
      html: results.html + newInput.html,
      mapping: {
        ...results.mapping,
        ...newInput.mapping
      }
    });
  }

  return results;
};

export const BuildForm = <FormData extends {}>(
  entries: Readonly<FormSchema>,
  formData: FormData,
  formId: string
): Form => {
  return new Form(entries, formData, formId);
};
