// TODO: Change to Map?
export type FormData = Record<string, any>;

type FormEntryBase = {
  name: string;
  label?: string;
  tooltip?: string;
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
};

//TODO: need to implement:
// checkbox-multiple
// radio

export type FormEntryInput = FormEntryBase & {
  inputType: 'text' | 'number' | 'checkbox' | 'switch' | 'color';
};

export type FormEntryFieldGroup = FormEntryBase & {
  inputType: 'fieldgroup';
  label: string;
  values: FormEntry[];
};

export type FormEntrySelection = FormEntryBase & {
  inputType: 'select' | 'select-multiple' | 'checkbox-multiple';
  values: string[];
};

export type FormEntry = FormEntrySelection | FormEntryInput | FormEntryFieldGroup;

export default class Forms {
  static FromJson(entries: Readonly<FormEntry[]>) {
    let inputs = '';

    entries.forEach(entry => {
      let input = '';
      const chosenLabel = entry.label ?? entry.name;
      const defaultData = entry.defaultValue ?? '';
      const required = entry.isRequired ? 'required' : '';
      const tooltip = entry.tooltip ? `title="${entry.tooltip}"` : '';

      switch (entry.inputType) {
        case 'fieldgroup':
          input += `
          <details>
            <summary><div class="summary-wrapper" ${tooltip}>${chosenLabel}</div></summary>
            <div class="content">
              ${this.FromJson(entry.values)}
            </div>
          </details>
          `;
          break;

        case 'switch':
        case 'checkbox':
          const switchAttr = entry.inputType === 'switch' ? 'role="switch"' : '';
          input += `
            <input 
              type="checkbox" 
              id="${entry.name}" ${required}
              name="${entry.name}" 
              ${switchAttr}
              ${defaultData ? 'checked' : ''} 
            >`;
          break;

        case 'color':
        case 'number':
        case 'text':
          input += `<input type="${entry.inputType}" value="${defaultData}" name="${entry.name}" id="${entry.name}" placeholder="${chosenLabel}" ${required}>`;
          break;

        case 'select':
        case 'select-multiple':
          let options = '';
          const isMulti = 'select-multiple' === entry.inputType ? 'multiple' : '';

          for (let j = 0; j < entry.values.length; j++) {
            options += `<option value="${entry.values[j]}">${entry.values![j]}</option>`;
          }
          input += `<select value="${defaultData}" name="${entry.name}" id="${entry.name}" ${isMulti} ${required}>${options}</select>`;
          break;

        default:
          const brokenItem = entry as any;
          throw new Error(`Invalid Form Type in Schema for "${brokenItem.name}": ${brokenItem.inputType}`);
      }

      if ('fieldgroup' !== entry.inputType) {
        input = `
          <div data-input-type="${entry.inputType}">
            <label for="${entry.name}" ${tooltip}>${chosenLabel}</label>
            ${input}
          </div>
        `;
      }

      inputs += input;
    });

    return inputs;
  }

  static Populate(form: HTMLFormElement, entries: FormData) {
    for (const [name, value] of Object.entries(entries)) {
      const element = form.elements.namedItem(name) as HTMLInputElement;

      if (!element) {
        continue;
      }

      switch (element.type) {
        case 'checkbox':
        case 'radio':
          element.checked = value;
          break;
        case 'color':
          element.value = `#${value.replace('#', '')}`;
          break;
        case 'select-multiple':
          const opts = [...(element as unknown as HTMLSelectElement).options];
          const values = value as string[];
          opts.forEach(opt => (opt.selected = values.includes(opt.value)));
          break;
        default:
          element.value = value;
      }
    }
  }

  static GetData(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);
    const json: any = {};

    for (let [name, value] of formData.entries()) {
      const input = formElement.elements.namedItem(name);

      if (input instanceof HTMLInputElement) {
        switch (input.type) {
          case 'number':
            json[name] = parseFloat(value as string);
            break;
          case 'checkbox':
            json[name] = input.checked;
            break;
          default:
            json[name] = value;
        }
      } else if (input instanceof HTMLSelectElement) {
        json[name] = [...input.options].filter(opt => opt.selected).map(opt => opt.value);
      } else {
        json[name] = value;
      }
    }

    return json;
  }
}
