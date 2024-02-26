/**
 * Serialize and Deserialize Data to and from an HTMLFormElement and a typed Object
 *
 * @module
 */

import set from 'lodash.set';
import { IsValidValue } from '../misc.js';

/**
 * Populates an `HTMLFormElement` with supplied Form Data.
 *
 * > NOTE: While Injecting values, if a DOM search for any "Parameter Name" in the "Form Data" results in multiple HTML Input Elements (colliquially known as {@link https://developer.mozilla.org/en-US/docs/Web/API/RadioNodeList | `RadioNodeList`}), the Deserializer expects the Form Data to supply an Array of data for said Parameter Name. Failure to have an Array of data results in an Error!
 * > Generally speaking, this should only occur for {@link utils/Forms/types.FormSchemaCheckedMultiInput | `FormSchemaCheckedMultiInput`}, as they're the expected type to have mutiple elements treated as "one."
 *
 * @param form - `HTMLFormElement` to use to Deserialize our Data.
 * @param formData - Data to Deserialize into our `HTMLFormElement`.
 */
export const Deserialize = (form: HTMLFormElement, formData: Record<string, any>) => {
  for (const [fieldName, fieldValue] of Object.entries(formData)) {
    // Do a simple lookup based on supplied Field Name within `FormData`
    const looseLookup = form.elements.namedItem(fieldName);
    let elements: Array<Element | RadioNodeList> = [looseLookup] as Array<Element | RadioNodeList>;
    // If we don't have matching field names, try based on assumption of an Array of Fields (ie, we don't have myField, but we have myField[0], myField[1], etc)
    const needsArrayOfFields = !looseLookup && Array.isArray(fieldValue);

    // If we are trying to inject an Array of Fields, iterate the number of values provided in the FormData, using the index of the value as the suffix for our element accessor.
    if (needsArrayOfFields) {
      elements = Array(fieldValue.length)
        .fill(0)
        .map((_i, idx) => form.elements.namedItem(`${fieldName}[${idx}]`)) as Array<Element | RadioNodeList>;
    }

    // No elements? Move on!
    if (!elements || 0 == elements.length) {
      continue;
    }

    // We have a list of Elements to inject values into...
    for (let idx = 0; idx < elements.length; idx++) {
      const element = elements[idx];
      // If we have an Array of Fields, access as an array, otherwise assume our array of `elements` we're currently iterating is 1 element, and thus has only 1 value.
      const currValue = needsArrayOfFields ? fieldValue[idx] : fieldValue;

      // "Invalid" values are completely skipped!
      if (false === IsValidValue(currValue)) {
        continue;
      }

      // Determine how to set value to our Element...

      // Standard-ish simple/single value assignment
      // Element we're trying to populate is a standard HTMLInputElement...
      if (element instanceof HTMLInputElement) {
        switch (element.type) {
          case 'file':
          // noop - we can't set values of files!
          case 'checkbox':
            element.checked = currValue;
            break;
          case 'color':
            element.value = `#${currValue.replace('#', '')}`;
            break;
          default:
            // Nothing special needed, just set the value.
            element.value = currValue;
        }
      } else if (element instanceof HTMLSelectElement) {
        // Element we're trying to populate is a Select Element...
        const opts = [...element.options];
        // Each `value` in our Array of data is a string array of `selectedIndex:value`.
        // Here, we get just the `selectedIndex` values, we don't actually care about the `value` of the values.
        const enabledIndices = (currValue as string[]).map(v => v.split(':')[0]);
        // Iterates the Options in the `HTMLSelectElement`, marking it selected if it matches the index.
        opts.forEach((opt, idx) => (opt.selected = enabledIndices.includes(idx.toString())));
      } else if (element instanceof RadioNodeList) {
        // Elements we're trying to populate match multiple names, thus we expect multiple values.
        try {
          const inputs = [...element.values()];
          // Identical to `HTMLSelectElement`, we collect the "Enabled" indices based on supplied value data.
          const enabledIndices = (currValue as string[]).map(v => v.split(':')[0]);

          // Inject data based on whether the index is marked as "Enabled"
          // At this time, we only expect checkbox (which includes switches) to
          // be considered as a group of Elements. Anything else is considered a FormSchema error with duplicate `name` entries.
          inputs.forEach((input, idx) => {
            if (input instanceof HTMLInputElement) {
              input.checked = enabledIndices.includes(idx.toString());
            } else {
              console.error(`Invalid Input Type: ${input}`);
            }
          });
        } catch (err) {
          if (false === err instanceof Error) {
            return;
          }

          // Generally speaking, only errors should occur if we're trying to access data as an Array, and it's a single value... Throw a generic error, and move on.

          throw new Error(
            'Supplied a single value where a list was expected. If this is unintentional, be sure to use unique names for your fields'
          );
        }
      }
    }
  }
};

/**
 * Extracts Form Data from an `HTMLFormElement`.
 *
 * > NOTE: While Extracting values, if a DOM search for any "Parameter Name" in the "Form Data" results in multiple HTML Input Elements (colliquially known as {@link https://developer.mozilla.org/en-US/docs/Web/API/RadioNodeList | `RadioNodeList`}), the Serializer will output Form Data as an Array of data for said Parameter Name.
 * > Generally speaking, this should only occur for {@link utils/Forms/types.FormSchemaCheckedMultiInput | `FormSchemaCheckedMultiInput`}, as they're the expected type to have mutiple elements treated as "one."
 */
export const Serialize = <Data extends {}>(formElement: HTMLFormElement): Data => {
  // Use DOM to build FormData object to iterate/evaluate...
  const formData = new FormData(formElement);
  const outputJson: Data = {} as Data;

  for (let [name, value] of formData.entries()) {
    // "Invalid" values are skipped!
    if (false === IsValidValue(value)) {
      continue;
    }

    // Get the input by "Param Name"
    const input = formElement.elements.namedItem(name);
    let newValues: any = [];

    // DOM search resulted in Singular Element, treat as single value
    // Evaluate the type to populate appropriately
    if (input instanceof HTMLInputElement) {
      switch (input.type) {
        case 'number':
          newValues = parseFloat(value as string);
          break;
        case 'checkbox':
          newValues = input.checked;
          break;
        default:
          // No special rules, just extract the value as our "newValues"
          newValues = value;
      }
    } else if (input instanceof HTMLSelectElement) {
      // DOM search resulted in Select Element, treat values as an Array, and build custom value output of `selectedIndex:value`.

      // prettier-ignore
      newValues = [...input.options]
        .filter(opt => opt.selected)
        .map(opt => `${opt.index}:${opt.value}`);
    } else if (input instanceof RadioNodeList) {
      // DOM search resulted in multiple Elements (aka, `RadioNodeList`), treat values as an Array, and build an Array of `selectedIndex:value`
      newValues = [...input]
        .map((opt, idx) => {
          if (false === opt instanceof HTMLInputElement) {
            return -1;
          }

          return opt.checked ? `${idx}:${opt.value}` : null;
        })
        .filter(item => !!item);
    } else {
      // TODO: Is this a valid use-case? If we're not an Input/Select or RadioNodeList then what are we!?!?!?
      newValues = value;
    }

    // Use lodash to `set` the values in our outputJSON object.
    // This lets us cheat, and use a stringified name agnostically regardless of single item vs array of data (i.e., `myValue = "someVal"` vs `myValue[0] = "someVal"`)
    set(outputJson, name, newValues);
  }

  return outputJson;
};
