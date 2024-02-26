export type FormSchemaEntryProcessorConstructor = {
  new (entry: FormSchemaEntryBase, formData: Record<string, any>): FormSchemaEntryProcessor;
};

export type FormSchemaEntryProcessor = {
  uniqueId: string;
  process(): ProcessedFormSchema;
};

export type FormSchemaEntryBase = {
  name: string;
  label?: string;
  tooltip?: string;
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
  inputType?: string;
};

export type FormSchemaButton = {
  inputType: 'button';
  name: string;
  label: string;
};

export type FormSchemaPasswordInput = FormSchemaEntryBase & {
  inputType: 'password';
};

export type FormSchemaCheckedInput = FormSchemaEntryBase & {
  inputType: 'checkbox' | 'switch' | 'radio-option';
};

export type FormSchemaSimpleInput = FormSchemaEntryBase & {
  inputType: 'color' | 'file' | 'hidden' | 'search' | 'text';
};

export type FormSchemaValidated = FormSchemaEntryBase & {
  inputType: 'email' | 'tel' | 'url';
  pattern?: string;
};

export type FormSchemaGrouping = FormSchemaEntryBase & {
  inputType: 'group-subschema' | 'grouparray' | 'grouplist';
  label: string;
  values: FormSchema;
  description?: string;
};

export type FormSchemaGroupingRow = FormSchemaEntryBase & {
  inputType: 'grouprow';
  values: FormSchema;
  arrayIndex?: number;
  description?: string;
};

export type FormSchemaCheckedMultiInput = FormSchemaEntryBase & {
  inputType: 'radio' | 'checkbox-multiple' | 'switch-multiple';
  values: string[];
};

export type FormSchemaSelect = FormSchemaEntryBase & {
  inputType: 'select' | 'select-multiple';
  values: string[];
};

export type FormSchemaMinMax = FormSchemaEntryBase & {
  inputType: 'number' | 'range' | 'date' | 'datetime-local' | 'month' | 'time' | 'week';
  max?: number;
  min?: number;
  step?: number;
};

export type FormSchemaEntry =
  | FormSchemaButton
  | FormSchemaCheckedInput
  | FormSchemaCheckedMultiInput
  | FormSchemaGrouping
  | FormSchemaGroupingRow
  | FormSchemaMinMax
  | FormSchemaPasswordInput
  | FormSchemaSelect
  | FormSchemaSimpleInput
  | FormSchemaValidated;

export type FormSchema = FormSchemaEntry[];

export type InputTypeEntryMap = Partial<Record<FormSchemaEntry['inputType'], Record<string, FormSchemaEntry>>>;

export type ProcessedFormSchema = {
  html: string;
  mapping: InputTypeEntryMap;
};

export type FormValidatorResult<FormData extends {}> = true | Partial<Record<keyof FormData, string>>;
export type FormValidatorResults<FormData extends {}> = true | FormValidatorResult<FormData>;
