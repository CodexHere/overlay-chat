import set from 'lodash.set';
import { IsValidValue } from '../misc.js';

export const Deserialize = (form: HTMLFormElement, formData: Record<string, any>) => {
  for (const [fieldName, fieldValue] of Object.entries(formData)) {
    const looseLookup = form.elements.namedItem(fieldName);
    let elements: Array<Element | RadioNodeList> = [looseLookup] as Array<Element | RadioNodeList>;
    const isArrayOfElements = !looseLookup && Array.isArray(fieldValue);

    if (isArrayOfElements) {
      elements = Array(fieldValue.length)
        .fill(0)
        .map((_i, idx) => form.elements.namedItem(`${fieldName}[${idx}]`)) as Array<Element | RadioNodeList>;
    }

    if (!elements || 0 == elements.length) {
      continue;
    }

    for (let idx = 0; idx < elements.length; idx++) {
      const element = elements[idx];
      const currValue = isArrayOfElements ? fieldValue[idx] : fieldValue;

      if (false === IsValidValue(currValue)) {
        continue;
      }

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
            element.value = currValue;
        }
      } else if (element instanceof HTMLSelectElement) {
        const opts = [...element.options];
        // `value` is a comma-separated string of `selectedIndex:value`
        const enabledIndices = (currValue as string[]).map(v => v.split(':')[0]);
        opts.forEach((opt, idx) => (opt.selected = enabledIndices.includes(idx.toString())));
      } else if (element instanceof RadioNodeList) {
        try {
          const inputs = [...element.values()];
          // `value` is a comma-separated string of selected indices
          const enabledIndices = (currValue as string[]).map(v => v.split(':')[0]);
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

          throw new Error(
            'Supplied a single value where a list was expected. If this is unintentional, be sure to use unique names for your fields'
          );
        }
      }
    }
  }
};

export const Serialize = <Data extends {}>(formElement: HTMLFormElement): Data => {
  const formData = new FormData(formElement);
  const json: Data = {} as Data;

  for (let [name, value] of formData.entries()) {
    if (false === IsValidValue(value)) {
      continue;
    }

    const input = formElement.elements.namedItem(name);
    let newValues: any = [];

    if (input instanceof HTMLInputElement) {
      switch (input.type) {
        case 'number':
          newValues = parseFloat(value as string);
          break;
        case 'checkbox':
          newValues = input.checked;
          break;
        default:
          if (value) {
            newValues = value;
          }
      }
    } else if (input instanceof HTMLSelectElement) {
      newValues = [...input.options].filter(opt => opt.selected).map(opt => `${opt.index}:${opt.value}`);
    } else if (input instanceof RadioNodeList) {
      newValues = [...input]
        .map((opt, idx) => {
          if (false === opt instanceof HTMLInputElement) {
            return -1;
          }

          return opt.checked ? `${idx}:${opt.value}` : null;
        })
        .filter(item => !!item);
    } else {
      if (value) {
        newValues = value;
      }
    }

    set(json, name, newValues);
  }

  return json;
};
