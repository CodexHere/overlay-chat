import { BOOLEAN_TRUES } from '../types.js';

// TODO: Change to Map?
export type FormData = Record<string, any>;

type FormEntryBase = {
  name: string;
  label?: string;
  tooltip?: string;
  defaultValue?: string | boolean | number;
  isRequired?: boolean;
};

export type FormEntryButton = {
  inputType: 'button';
  name: string;
  label: string;
};

export type FormEntryInput = FormEntryBase & {
  inputType: 'text' | 'password' | 'number' | 'checkbox' | 'switch' | 'radio-option' | 'color';
};

export type FormEntryGrouping = FormEntryBase & {
  inputType: 'fieldgroup' | 'arraygroup';
  label: string;
  values: FormEntry[];
  description?: string;
};

export type FormEntrySelection = FormEntryBase & {
  inputType: 'select' | 'radio' | 'select-multiple' | 'checkbox-multiple' | 'switch-multiple';
  values: string[];
};

export type FormEntry = FormEntryButton | FormEntrySelection | FormEntryInput | FormEntryGrouping;

let labelId = 0;

export type ParsedJsonResults = {
  results: string;
  mapping: Partial<Record<FormEntry['inputType'], Record<string, FormEntry>>>;
};

type ParsedJsonMap = ParsedJsonResults['mapping'];

export const FromJson = <Settings extends {}>(
  entries: Readonly<FormEntry[]>,
  settings: Settings
): ParsedJsonResults => {
  let mapping: ParsedJsonMap = {};
  let results = '';

  entries.forEach(entry => {
    let input = '';

    if (!entry.name) {
      throw new Error('FormEntry does not have a `name` property! ' + JSON.stringify(entry));
    }

    const isButton = 'button' !== entry.inputType;
    const chosenLabel = entry.label ?? entry.name;
    const defaultData = (isButton && entry.defaultValue) ?? '';
    const required = isButton && entry.isRequired ? 'required' : '';
    const tooltip = isButton && entry.tooltip ? `title="${entry.tooltip}"` : '';
    const uniqueId = `${entry.name}-${labelId++}`; // unique ID for labels
    const nameOrLabelId = entry.name ?? entry.label?.toLocaleLowerCase().replaceAll(' ', '_');

    let inputType = '';
    let recursedCall: ParsedJsonResults | undefined;
    let description = '';

    /**
     * Input-level Generation
     */
    switch (entry.inputType) {
      case 'arraygroup':
        const settingsValues = settings[nameOrLabelId as keyof Settings];
        const numSettings = Array.isArray(settingsValues) ? settingsValues.length : 1;
        const recursedCallArray = Array(numSettings)
          .fill(0)
          .map(_settingCount => {
            return entry.values.map(fe => {
              const processedJson = FromJson([fe], settings);
              mapping = { ...mapping, ...processedJson.mapping };
              return processedJson.results;
            });
          });

        description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

        const tableData = `
          <table>
            <thead>
              <tr>
                <th>${entry.values.map(fe => fe.label).join('</th><th>')}</th>
              </tr>
            </thead>
            <tbody>
              ${recursedCallArray.map(row => `<tr><td>${row.join('</td><td>')}</td></tr>`)}
            </tbody>
          </table>
        `;

        input += `
            <details 
              id="${nameOrLabelId}" 
              data-input-type="${entry.inputType}"
            >
              <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
              <div class="content">
                ${description}
                ${tableData}

                <div class="arraygroup-controls" data-inputs='${JSON.stringify(entry.values)}'>
                  <button name="addentry-${nameOrLabelId}" class="add">+</button>
                  <button name="delentry-${nameOrLabelId}" class="subtract">-</button>
                </div>
              </div>
            </details>
            `;
        break;
      case 'fieldgroup':
        recursedCall = FromJson(entry.values, settings);
        mapping = { ...mapping, ...recursedCall.mapping };

        description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

        input += `
          <details 
            id="${entry.name ?? entry.label.toLocaleLowerCase().replaceAll(' ', '_')}" 
            data-input-type="${entry.inputType}"
          >
            <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
            <div class="content">
              ${description}
              ${recursedCall.results}
            </div>
          </details>
          `;
        break;

      case 'button':
        input += `
        <button id="${uniqueId}" name="${entry.name}">${chosenLabel}</button>
        `;
        break;

      case 'radio-option':
      case 'switch':
      case 'checkbox':
        const switchAttr = entry.inputType === 'switch' ? 'role="switch"' : '';
        inputType = entry.inputType === 'radio-option' ? 'radio' : 'checkbox';
        input += `
            <input
              type="${inputType}"
              id="${uniqueId}"
              name="${entry.name}"
              value="${chosenLabel}"
              ${switchAttr}
              ${defaultData ? 'checked' : ''}
            >`;
        break;

      case 'radio':
      case 'checkbox-multiple':
      case 'switch-multiple':
        inputType =
          'radio' === entry.inputType ?
            'radio-option'
          : (entry.inputType.replace('-multiple', '') as FormEntry['inputType']);

        input += '<div class="input-group">';

        entry.values.forEach(value => {
          recursedCall = FromJson(
            [
              {
                name: entry.name,
                label: value,
                inputType
              } as FormEntryInput
            ],
            settings
          );

          input += recursedCall.results;
          mapping = { ...mapping, ...recursedCall.mapping };
        });

        input += '</div>';
        break;

      case 'color':
      case 'number':
      case 'text':
      case 'password':
        input += `
            <input
              type="${entry.inputType}"
              value="${defaultData}"
              id="${uniqueId}"
              name="${entry.name}"
              placeholder="${chosenLabel}"
              ${required}
            >
        `;

        if ('password' === entry.inputType) {
          recursedCall = FromJson(
            [
              {
                inputType: 'button',
                label: '👁',
                name: `password-view-${entry.name}`
              }
            ],
            settings
          );

          input = `
            <div class='password-wrapper'>
              ${input}
              ${recursedCall.results}
            </div>
          `;
          mapping = { ...mapping, ...recursedCall.mapping };
        }

        break;

      case 'select':
      case 'select-multiple':
        let options = '';
        const isMulti = 'select-multiple' === entry.inputType ? 'multiple' : '';

        for (let j = 0; j < entry.values.length; j++) {
          options += `<option value="${entry.values[j]}">${entry.values![j]}</option>`;
        }
        input += `
            <select
              value="${defaultData}"
              id="${uniqueId}"
              name="${entry.name}"
              ${isMulti}
              ${required}
            >
              ${options}
            </select>`;
        break;

      default:
        const brokenItem = entry as any;
        throw new Error(
          `Invalid Form Type in Schema for "${brokenItem.name ?? brokenItem.label}": ${brokenItem.inputType}`
        );
    }

    /**
     * Label Wrapping
     */
    switch (entry.inputType) {
      case 'button':
      case 'fieldgroup':
      case 'arraygroup':
        // noop
        break;

      default:
        const skipForAttr = ['checkbox-multiple', 'switch-multiple', 'radio'];
        const forAttr = skipForAttr.includes(entry.inputType) ? '' : `for="${uniqueId}"`;

        input = `
              <div data-input-type="${entry.inputType}">
                <label ${forAttr} ${tooltip}>${chosenLabel}</label>
                ${input}
              </div>
            `;
        break;
    }

    results += input;

    mapping[entry.inputType] = mapping[entry.inputType] || {};
    mapping[entry.inputType]![entry.name] = entry;
  });

  return {
    results,
    mapping
  };
};

export const Populate = (form: HTMLFormElement, entries: FormData) => {
  for (const [name, value] of Object.entries(entries)) {
    const element = form.elements.namedItem(name);

    if (!element) {
      continue;
    }

    if (element instanceof HTMLInputElement) {
      switch (element.type) {
        case 'checkbox':
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
    } else if (element instanceof RadioNodeList) {
      [...element.entries()].forEach(([idx, input]) => {
        if (input instanceof HTMLInputElement) {
          const [checked, _inputValue] = value[idx].split(':');
          input.checked = BOOLEAN_TRUES.includes(checked);
        } else {
          console.error('Invalid Input Type: ${input}');
        }
      });
    }
  }
};

export const GetData = (formElement: HTMLFormElement) => {
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
    } else if (input instanceof RadioNodeList) {
      json[name] = ([...input] as HTMLInputElement[]).map(opt =>
        'checkbox' === opt.type ? `${opt.checked}:${opt.value}` : opt.value
      );
      // Cull empty values
      json[name] = (json[name] as []).filter(item => !!item);
    } else {
      json[name] = value;
    }
  }

  return json;
};
