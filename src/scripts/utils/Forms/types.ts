/**
 * Utility Types for Form Processing
 *
 * @module
 */

/**
 * Static Typing of a {@link FormSchemaEntryProcessor | `FormSchemaEntryProcessor`}.
 */
export type FormSchemaEntryProcessorConstructor = {
  /**
   * Constructor Definition
   *
   * @param entry - {@link FormSchemaEntry | `FormSchemaEntry`} to Process.
   * @param formData - Associative Data for the Form being rendered.
   */
  new (entry: FormSchemaEntryBase, formData: Record<string, any>): FormSchemaEntryProcessor;
};

/**
 * Instance Typing of a `FormSchemaEntryProcessor`
 */
export type FormSchemaEntryProcessor = {
  /**
   * Unique ID for the Processor.
   *
   * This is often used for an Element ID.
   */
  uniqueId: string;

  /**
   * Process the {@link FormSchema | `FormSchema`} and return the results.
   */
  process(): ProcessedFormSchema;
};

/**
 * Base type for most FormSchemaEntry types.
 */
export type FormSchemaEntryBase = {
  /** Name of the Entry. Translates to an HTML Element ID. */
  name: string;
  /** Label for the Entry. Translates to `<Label>` or similar depending on the `inputType`. */
  label?: string;
  /** Supplied Tooltip message for the Entry. */
  tooltip?: string;
  /** Default Value(s) for the Entry. */
  defaultValue?: string | boolean | number;
  /** Marks the Entry as Required for Form Validation. */
  isRequired?: boolean;
  /** Targets the Type of Input this FormSchema represents. */
  inputType?: string;
};

/**
 * Simple Button.
 *
 * > NOTE: Not extending `FormSchemaEntryBase`!
 */
export type FormSchemaButton = {
  /** Button Type. */
  inputType: 'button';
  /** Name of the Entry. Translates to an HTML Element ID. */
  name: string;
  /** Label for the Entry. Translates to the CTA Text on the Button. */
  label: string;
};

/**
 * Password Input.
 */
export type FormSchemaPasswordInput = FormSchemaEntryBase & {
  /** Password Type. */
  inputType: 'password';
};

/**
 * Checked Input.
 *
 * These Input Types have a `boolean` value.
 */
export type FormSchemaCheckedInput = FormSchemaEntryBase & {
  /** Checked Element Type. */
  inputType: 'checkbox' | 'switch' | 'radio-option';
};

/**
 * Simple Input.
 *
 * These Input Types don't have any special edge cases.
 */
export type FormSchemaSimpleInput = FormSchemaEntryBase & {
  /** Simple Input Types. */
  inputType: 'color' | 'file' | 'hidden' | 'search' | 'text';
};

/**
 * Validated Input Types.
 *
 * These Input Types have a `pattern` for Validation.
 */
export type FormSchemaValidated = FormSchemaEntryBase & {
  /** Validated Input Types. */
  inputType: 'email' | 'tel' | 'url';
  /** RegEx Pattern for Input Validation. */
  pattern?: string;
};

/**
 * Grouping Schema.
 *
 * Represents a Grouping Type of a sub-Schema.
 */
export type FormSchemaGrouping = FormSchemaEntryBase & {
  /** Grouping Schema Types. */
  inputType: 'group-subschema' | 'grouparray' | 'grouplist';
  /** Label/Header for Grouping. */
  label: string;
  /** Sub-Schema to Group for processing.  */
  subSchema: FormSchema;
  /** Optional Description section for a Grouping. */
  description?: string;
};

/**
 * Row Grouping Schema.
 *
 * Represents a Row of a Sub-Schema in a Grouping Type.
 */
export type FormSchemaGroupingRow = FormSchemaEntryBase & {
  /** Row Grouping Schema Type. */
  inputType: 'grouprow';
  /** Sub-Schema to Group for processing.  */
  subSchema: FormSchema;
  /** Array Index to apply as a suffix (i.e., `1` as an Index will apply suffix of `[1]`) for the `name` of every {@link FormSchemaEntry | `FormSchemaEntry`} in the `values` collection. */
  arrayIndex?: number;
};

/**
 * Checked Multi Inputs.
 *
 * These Inputs are similar to {@link FormSchemaCheckedInput | `FormSchemaCheckedInput`}, however there are multiple that can be selected per parameter name.
 *
 */
export type FormSchemaCheckedMultiInput = FormSchemaEntryBase & {
  /** Checked Multi Input Types. */
  inputType: 'radio' | 'checkbox-multiple' | 'switch-multiple';
  /** Option Values to add as a list of {@link FormSchemaCheckedInput | `FormSchemaCheckedInput`}s. */
  values: string[];
};

/**
 * Select Input Types.
 *
 * These are near identical to {@link FormSchemaCheckedMultiInput | `FormSchemaCheckedMultiInput`}, with the exception of how the HTML is rendered as a `<select>` Element rather than an `<input>` Element.
 */
export type FormSchemaSelect = FormSchemaEntryBase & {
  /** Select Input Types. */
  inputType: 'select' | 'select-multiple';
  /** Option Values to add to the `<select>` Element. */
  values: string[];
};

/**
 * MinMax Input Types.
 *
 * These Input Types have bounds they can be constrained to.
 */
export type FormSchemaMinMax = FormSchemaEntryBase & {
  /** MinMax Input Types. */
  inputType: 'number' | 'range' | 'date' | 'datetime-local' | 'month' | 'time' | 'week';
  /** Maximum Value to keep Input Value in-bounds. */
  max?: number;
  /** Minimum Value to keep Input Value in-bounds. */
  min?: number;
  /** Step Value to increment/decrement the Input Value. */
  step?: number;
};

/**
 * All possible variants of a `FormSchemaEntry` as a Union Type.
 */
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

/** Helper Type to represent a collection of {@link FormSchemaEntry | `FormSchemaEntry`}s. */
export type FormSchema = FormSchemaEntry[];

/**
 * Mapping that represents the construction of a Form.
 *
 * The output maps the `inputType` -> `{ "parameterName": FormSchemaEntry }` for possible evaluation later on.
 */
export type InputTypeEntryMap = Partial<Record<FormSchemaEntry['inputType'], Record<string, FormSchemaEntry>>>;

/**
 * Mapping that represents the construction of a Form.
 *
 * The output maps the `name` -> `FormSchemaEntry` for possible evaluation later on.
 */
export type NameEntryMap = Partial<Record<FormSchemaEntry['name'], FormSchemaEntry>>;

/**
 * Different Mappings used for custom evaluation/processing.
 */
export type ProcessedFormSchemaMappings = {
  /** Maps by InputType */
  byType: InputTypeEntryMap;
  /** Maps by Name */
  byName: NameEntryMap;
};

/**
 * Results from processing a {@link FormSchemaEntry | `FormSchemaEntry`}.
 *
 * These results house the HTML necessary to populate the Elements of an `HTMLFormElement`, as well as the {@link InputTypeEntryMap | Input Type Mapping} of the processed {@link FormSchema | `FormSchema`}.
 *
 * > NOTE: Recursive/Iterative calls to {@link utils/Forms/Builder.BuildFormSchema | `BuildFormSchema`} will need to correctly aggregate these to properly represent an entire {@link FormSchema | `FormSchema`}.
 */
export type ProcessedFormSchema = {
  html: string;
  mappings: ProcessedFormSchemaMappings;
};

/**
 * Results from Validating a Form.
 *
 * The process of Validation should generally consider built-in HTML5 Validation, as well as adhoc evaluation based on needs.
 *
 * If the Validation is completely successful, it returns `true`, otherwise it will return a mapping of `"paramName"` -> `"Error Message"`.
 */
export type FormValidatorResults<FormData extends {} = {}> = true | Partial<Record<keyof FormData, string>>;
