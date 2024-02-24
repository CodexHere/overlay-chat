export type SettingsSchemaProcessorConstructor = {
  new (entry: SettingsSchemaEntryBase, settings: Record<string, any>): SettingsSchemaProcessor;
};

export type SettingsSchemaProcessor = {
  uniqueId: string;
  process(): ProcessedJsonResults;
};

export type SettingsSchemaEntryBase = {
  name: string;
  label?: string;
  tooltip?: string;
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
  inputType?: string;
};

export type SettingsSchemaButton = {
  inputType: 'button';
  name: string;
  label: string;
};

export type SettingsSchemaPasswordInput = SettingsSchemaEntryBase & {
  inputType: 'password';
};

export type SettingsSchemaCheckedInput = SettingsSchemaEntryBase & {
  inputType: 'checkbox' | 'switch' | 'radio-option';
};

export type SettingsSchemaSimpleInput = SettingsSchemaEntryBase & {
  inputType: 'color' | 'file' | 'hidden' | 'search' | 'text';
};

export type SettingsSchemaValidated = SettingsSchemaEntryBase & {
  inputType: 'email' | 'tel' | 'url';
  pattern?: string;
};

export type SettingsSchemaGrouping = SettingsSchemaEntryBase & {
  inputType: 'group-subschema' | 'grouparray' | 'grouplist';
  label: string;
  values: SettingsSchemaEntry[];
  description?: string;
};

export type SettingsSchemaGroupingRow = SettingsSchemaEntryBase & {
  inputType: 'grouprow';
  values: SettingsSchemaEntry[];
  arrayIndex?: number;
  description?: string;
};

export type SettingsSchemaCheckedMultiInput = SettingsSchemaEntryBase & {
  inputType: 'radio' | 'checkbox-multiple' | 'switch-multiple';
  values: string[];
};

export type SettingsSchemaSelect = SettingsSchemaEntryBase & {
  inputType: 'select' | 'select-multiple';
  values: string[];
};

export type SettingsSchemaMinMax = SettingsSchemaEntryBase & {
  inputType: 'number' | 'range' | 'date' | 'datetime-local' | 'month' | 'time' | 'week';
  max?: number;
  min?: number;
  step?: number;
};

export type SettingsSchemaEntry =
  | SettingsSchemaButton
  | SettingsSchemaCheckedInput
  | SettingsSchemaCheckedMultiInput
  | SettingsSchemaGrouping
  | SettingsSchemaGroupingRow
  | SettingsSchemaMinMax
  | SettingsSchemaPasswordInput
  | SettingsSchemaSelect
  | SettingsSchemaSimpleInput
  | SettingsSchemaValidated;

export type ProcessedJsonMap = Partial<Record<SettingsSchemaEntry['inputType'], Record<string, SettingsSchemaEntry>>>;

export type ProcessedJsonResults = {
  results: string;
  mapping: ProcessedJsonMap;
};

export type FormValidatorResult<FormData extends {}> = true | Partial<Record<keyof FormData, string>>;
export type FormValidatorResults<FormData extends {}> = true | FormValidatorResult<FormData>;
