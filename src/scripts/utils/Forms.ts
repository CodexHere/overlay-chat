export type FormData = Record<string, any>;

export type FormEntry = {
  name: string;
  label?: string;
  tooltip?: string;
  inputType?: 'text' | 'number' | 'checkbox' | 'select' | 'color';
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
  values?: string[];
};

export default class Forms {
  static FromJson(entries: FormEntry[]) {
    let inputs = '';

    for (let i = 0; i < entries.length; i++) {
      const item = entries[i];
      const chosenLabel = item.label ?? item.name;
      const defaultData = item.defaultValue ?? '';
      const required = item.isRequired ? 'required' : '';
      const tooltip = item.tooltip ? `title="${item.tooltip}"` : '';

      inputs += `<div><label for="${item.name}" ${tooltip}>${chosenLabel}</label>`;

      switch (item.inputType) {
        case 'checkbox':
          inputs += `<input type="checkbox" ${defaultData ? 'checked' : ''} name="${item.name}" id="${
            item.name
          }" ${required}>`;
          break;
        case 'select':
          let options = '';
          for (let j = 0; j < item.values!.length; j++) {
            options += `<option value="${item.values![j]}">${item.values![j]}</option>`;
          }
          inputs += `<select value="${defaultData}" name="${item.name}" id="${item.name}" ${required}>${options}</select>`;
          break;
        case 'number':
        case 'color':
        case 'text':
          inputs += `<input type="${item.inputType}" value="${defaultData}" name="${item.name}" id="${item.name}" placeholder="${chosenLabel}" ${required}>`;
          break;
        default:
          throw new Error(`Invalid Form Type in Schema for "${item.name}": ${item.inputType}`);
      }

      inputs += '</div>';
    }

    return inputs;
  }

  static Populate(form: HTMLFormElement, entries: FormData) {
    for (const [name, value] of Object.entries(entries)) {
      const element = form.elements.namedItem(name) as HTMLInputElement;

      switch (value) {
        case 'true':
        case 'false':
        case 'yes':
        case 'no':
        case 'y':
        case 'n':
          element.checked = value;
          break;
        default:
          element.value = 'color' === element.type ? `#${value}` : value;
          break;
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
      } else {
        json[name] = value;
      }
    }

    return json;
  }
}
