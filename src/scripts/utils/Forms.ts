import merge from 'lodash.merge';
import set from 'lodash.set';
import { IsValidValue } from './misc.js';

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

  for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
    const entry = entries[entryIdx];
    let input = '';

    if (!entry.name) {
      throw new Error('FormEntry does not have a `name` property! ' + JSON.stringify(entry));
    }

    const isButton = 'button' !== entry.inputType;
    const chosenLabel = entry.label ?? entry.name;
    const defaultData = (isButton && entry.defaultValue) ?? '';
    const required = isButton && entry.isRequired ? 'required' : '';
    const tooltip = isButton && entry.tooltip ? `title="${entry.tooltip}"` : '';
    const nameOrLabelId = (entry.name ?? entry.label)?.toLocaleLowerCase().replaceAll(' ', '_');
    const uniqueId = `${nameOrLabelId}-${labelId++}`; // unique ID for labels

    let inputType = '';
    let recursedCall: ParsedJsonResults | undefined;
    let description = '';

    const settingsMapCount = Object.keys(settings).reduce(
      (maxCountMap, paramName) => {
        const paramVal = settings[paramName as keyof Settings];
        const settingsCount = Array.isArray(paramVal) ? paramVal.length : 1;
        maxCountMap[paramName] = maxCountMap[paramName] ?? 0;
        maxCountMap[paramName] += 0 + settingsCount;

        return maxCountMap;
      },
      {} as Record<string, any>
    );

    /**
     * Input-level Generation
     */
    switch (entry.inputType) {
      case 'arraygroup':
        const groupParamNames = entry.values.map(fe => fe.name);
        const numSettings = groupParamNames.reduce((maxCount, paramName) => {
          return Math.max(settingsMapCount[paramName] ?? 0, maxCount);
        }, 1);

        const recursedCallArray = Array(numSettings)
          .fill(0)
          .map((_settingCount, settingIdx) => {
            return entry.values.map(fe => {
              const processedJson = FromJson(
                [
                  {
                    ...fe,
                    name: `${fe.name}[${settingIdx}]`
                  }
                ],
                settings
              );
              mapping = merge({}, mapping, processedJson.mapping);

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
              ${recursedCallArray.map(row => `<tr><td>${row.join('</td><td>')}</td></tr>`).join('')}
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

                <div class="table-wrapper">
                  ${tableData}
                </div>

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
        mapping = merge({}, mapping, recursedCall.mapping);

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
          mapping = merge({}, mapping, recursedCall.mapping);
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
          mapping = merge({}, mapping, recursedCall.mapping);
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

    mapping[entry.inputType] = mapping[entry.inputType] ?? {};
    mapping[entry.inputType]![entry.name] = entry;
  }

  return {
    results,
    mapping
  };
};

export const Hydrate = (form: HTMLFormElement, formData: FormData) => {
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

export const GetData = <Data extends {}>(formElement: HTMLFormElement): Data => {
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
