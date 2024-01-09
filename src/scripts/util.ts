export type FormEntry = {
  name: string;
  label?: string;
  tooltip?: string;
  inputType?: 'text' | 'number' | 'checkbox' | 'select' | 'color';
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
  values?: string[];
};

export type FormData = Record<string, any>;

export const DEFAULT_COLORS = [
  '#b52d2d',
  '#5e5ef2',
  '#5cb55c',
  '#21aabf',
  '#FF7F50',
  '#9ACD32',
  '#FF4500',
  '#2E8B57',
  '#DAA520',
  '#D2691E',
  '#5F9EA0',
  '#1E90FF',
  '#FF69B4',
  '#8A2BE2',
  '#00FF7F'
];

export const DomParser = new DOMParser();

export const HashCode = (str: string) => str.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

export const GetColorForUsername = (userName: string) =>
  DEFAULT_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_COLORS.length - 1)];

export const RenderTemplate = (container: HTMLElement, template: HandlebarsTemplateDelegate, data = {}) => {
  const renderedTemplate = template(data);

  // Parse the rendered template as HTML
  const newDocument = DomParser.parseFromString(renderedTemplate, 'text/html');
  const { firstChild: childToAppend } = newDocument.body;

  if (!container || !childToAppend) {
    return;
  }

  // Inject the HTML into the container
  container.appendChild(childToAppend);
};

export const GenerateFormFromSchema = (entries: FormEntry[]) => {
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
};

export const PopulateFormFromJson = (form: HTMLFormElement, entries: FormData) => {
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
};

export const FormToJson = (formElement: HTMLFormElement) => {
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
};

export const JsonToQueryString = (json: any) =>
  Object.keys(json)
    .reduce<string[]>((kvp, key) => {
      json[key] && kvp.push(key + '=' + json[key]);
      return kvp;
    }, [])
    .join('&');
