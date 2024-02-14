import merge from 'lodash.merge';
import set from 'lodash.set';
import { IsInViewPort } from './DOM.js';
import { IsValidValue } from './misc.js';

export type FormData = Record<string, any>;

export type FormValidatorResult<FormData extends {}> = true | Partial<Record<keyof FormData, string>>;
export type FormValidatorResults<FormData extends {}> = true | FormValidatorResult<FormData>;

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

export type FormEntryValidated = FormEntryBase & {
  inputType: 'email' | 'tel' | 'url';
  pattern?: string;
};

export type FormEntryInput = FormEntryBase & {
  inputType:
    | 'checkbox'
    | 'color'
    | 'file'
    | 'hidden'
    | 'number'
    | 'password'
    | 'radio-option'
    | 'search'
    | 'switch'
    | 'text';
};

export type FormEntryGrouping = FormEntryBase & {
  inputType: 'fieldgroup' | 'arraygroup' | 'arraylist';
  label: string;
  values: FormEntry[];
  description?: string;
};

export type FormEntryRow = FormEntryBase & {
  inputType: 'array-row';
  values: FormEntry[];
  arrayIndex?: number;
  description?: string;
};

export type FormEntrySelection = FormEntryBase & {
  inputType: 'select' | 'radio' | 'select-multiple' | 'checkbox-multiple' | 'switch-multiple';
  values: string[];
};

export type FormEntryDate = FormEntryBase & {
  inputType: 'date' | 'datetime-local' | 'month' | 'time' | 'week';
  max?: string;
  min?: string;
  step?: number;
};

export type FormEntryRange = FormEntryBase & {
  inputType: 'range';
  max?: number;
  min?: number;
  step?: number;
};

export type FormEntry =
  | FormEntryButton
  | FormEntryDate
  | FormEntryGrouping
  | FormEntryInput
  | FormEntryRange
  | FormEntryRow
  | FormEntrySelection
  | FormEntryValidated;

let labelId = 0;
let _timeoutId = 0;

const INPUT_VALIDATION_TTY = 500;

const PATTERN_DEFAULTS = {
  tel: '[0-9]{3}-[0-9]{3}-[0-9]{4}',
  email: '[a-z0-9._%+-]+@[a-z0-9.-]+.[a-z]{2,4}$',
  url: ''
};

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
      case 'array-row':
        const rowEntries = entry.values;
        // `entry.label` identifies array index access
        const suffix = undefined !== entry.arrayIndex ? `[${entry.arrayIndex}]` : '';

        const columns = rowEntries.map(rowEntry => {
          const processedJson = FromJson(
            [
              {
                ...rowEntry,
                name: `${rowEntry.name}${suffix}`
              }
            ],
            settings
          );

          mapping = merge({}, mapping, processedJson.mapping);

          return processedJson.results;
        });

        let rowContent = '';
        columns.forEach((content, idx) => {
          const entry = rowEntries[idx];
          rowContent += `<td data-col-type="${entry.inputType}">${content}</td>`;
        });

        input += `<tr>${rowContent}</tr>`;

        break;
      case 'arraylist':
      case 'arraygroup':
        const isList = 'arraylist' === entry.inputType;
        const groupParamNames = entry.values.map(fe => fe.name);
        const numSettings = groupParamNames.reduce((maxCount, paramName) => {
          return Math.max(settingsMapCount[paramName] ?? 0, maxCount);
        }, 1);

        const recursedCallArray = Array(numSettings)
          .fill(0)
          .map((_empty, settingIdx) => {
            const row = FromJson(
              [
                {
                  inputType: 'array-row',
                  name: 'array-row',
                  arrayIndex: isList ? settingIdx : undefined,
                  values: entry.values
                }
              ],
              settings
            );

            mapping = merge({}, mapping, row.mapping);

            return row;
          });

        description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

        let headers = '';
        entry.values.forEach(formEntry => {
          headers += `
            <th data-col-type="${formEntry.inputType}">
              ${formEntry.label ?? formEntry.name}
            </th>
            `;
        });

        const tableData = `
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              ${recursedCallArray.map(row => row.results).join('')}
            </tbody>
          </table>
        `;

        const coreContent = `
          ${description}

          <div class="table-wrapper">
            ${tableData}
          </div>
        `;

        if (isList) {
          input += `
            <details 
              id="${nameOrLabelId}" 
              data-input-type="${entry.inputType}"
            >
              <summary><div class="label-wrapper" ${tooltip}>${chosenLabel}</div></summary>
              <div class="content">
                ${coreContent}

                <div class="arraylist-controls" data-inputs='${JSON.stringify(entry.values)}'>
                  <button name="addentry-${nameOrLabelId}" class="add">+</button>
                  <button name="delentry-${nameOrLabelId}" class="subtract">-</button>
                </div>
              </div>
            </details>
            `;
        } else {
          input += `
            <div
              id="${nameOrLabelId}" 
              data-input-type="${entry.inputType}"
            >
              <div class="label-wrapper" ${tooltip}>${chosenLabel}</div>

              ${coreContent}
            </div>
          `;
        }

        break;
      case 'fieldgroup':
        recursedCall = FromJson(entry.values, settings);
        mapping = merge({}, mapping, recursedCall.mapping);

        description = entry.description ? `<blockquote class="description">${entry.description}</blockquote>` : '';

        input += `
          <details 
            id="${nameOrLabelId}" 
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
      case 'email':
      case 'file':
      case 'hidden':
      case 'number':
      case 'password':
      case 'range':
      case 'search':
      case 'tel':
      case 'text':
      case 'url':
      case 'date':
      case 'datetime-local':
      case 'month':
      case 'time':
      case 'week':
        const validated = ['tel', 'email', 'url'];
        const minMaxed = ['date', 'datetime-local', 'month', 'time', 'week', 'range'];

        let validatorPattern = '';
        let min = '';
        let max = '';
        let step = '';

        if (minMaxed.includes(entry.inputType)) {
          const _entry = entry as FormEntryDate | FormEntryRange;
          min = _entry.min ? `min="${_entry.min}"` : '';
          max = _entry.max ? `max="${_entry.max}"` : '';
          step = _entry.step ? `step="${_entry.step}"` : '';
        }

        if (validated.includes(entry.inputType)) {
          const _entry = entry as FormEntryValidated;
          const chosenPattern = _entry.pattern ?? PATTERN_DEFAULTS[_entry.inputType];
          validatorPattern = chosenPattern ? `pattern="${chosenPattern}"` : '';
        }

        input += `
            <input
              type="${entry.inputType}"
              value="${defaultData}"
              id="${uniqueId}"
              name="${entry.name}"
              placeholder="${chosenLabel}"
              ${validatorPattern}
              ${min}
              ${max}
              ${step}
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

        if ('range' === entry.inputType) {
          input = `
            <div class='range-wrapper'>
              ${input}
              <input type="number" class="range-display" />
            </div>
          `;
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
      case 'arraylist':
      case 'arraygroup':
      case 'array-row':
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

export const BindInteractionEvents = (formElement?: HTMLFormElement) => {
  if (!formElement) {
    return;
  }

  formElement.addEventListener('input', onFormChanged);
  formElement.addEventListener('click', onFormClicked);
  formElement.addEventListener('mousemove', onFormMouseMove);

  initRangeDisplays(formElement);
};

export const UnbindInteractionEvents = (formElement?: HTMLFormElement) => {
  if (!formElement) {
    return;
  }

  formElement.removeEventListener('input', onFormChanged);
  formElement.removeEventListener('click', onFormClicked);
  formElement.removeEventListener('mousemove', onFormMouseMove);
};

const onFormChanged = (event: Event) => {
  updateRangeDisplays(event);
  updateRangeValue(event);
};

const onFormClicked = (event: MouseEvent) => {
  checkButtonsClicked(event);
};

const initRangeDisplays = (formElement: HTMLFormElement) => {
  // prettier-ignore
  formElement
    .querySelectorAll<HTMLInputElement>('input[type="range"]')
    .forEach(updateRangeDisplay);
};

const updateRangeDisplays = (event: Event) => {
  if (false === event.target instanceof HTMLInputElement) {
    return;
  }

  if (event.target.type !== 'range') {
    return;
  }

  const range = event.target;
  updateRangeDisplay(range);
};

const updateRangeValue = (event: Event) => {
  if (false === event.target instanceof HTMLInputElement) {
    return;
  }

  if (false === event.target.classList.contains('range-display')) {
    return;
  }

  const range = event.target.closest('.range-wrapper ')?.querySelector('input[type="range"]') as HTMLInputElement;
  range.value = event.target.value;
};

const updateRangeDisplay = (range: HTMLInputElement) => {
  const rangeDisplay = range.closest('.range-wrapper ')?.querySelector('.range-display') as HTMLInputElement;
  rangeDisplay.value = range.value;
};

const checkButtonsClicked = (event: MouseEvent) => {
  if (false === event.target instanceof HTMLButtonElement) {
    return;
  }

  // A Button might have been clicked
  const btn = event.target;
  const name = btn.name;

  if (true === name.startsWith('password-view')) {
    return passwordToggle(event, btn);
  } else if (true === name.startsWith('addentry') || true === name.startsWith('delentry')) {
    return manageArrayGroupEntries(event, btn);
  }
};

const passwordToggle = (event: MouseEvent, btn: HTMLButtonElement) => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const name = btn.name.replace('password-view-', '');
  const wrapper = btn.closest('div.password-wrapper');
  const input = wrapper?.querySelector(`input[name="${name}"]`) as HTMLInputElement;

  if (input) {
    input.type = 'text' === input.type ? 'password' : 'text';
  }
};

const manageArrayGroupEntries = (event: MouseEvent, btn: HTMLButtonElement) => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const isAdd = btn.name.startsWith('add');
  const content = btn.closest('.content');
  const tableBody = content?.querySelector('table tbody');

  if (!tableBody) {
    return;
  }

  if (false === isAdd) {
    const lastChild = [...tableBody.children][tableBody.children.length - 1];
    if (lastChild) {
      tableBody.removeChild(lastChild);
    }
  } else {
    const arrayRowJson = content?.querySelector('.arraylist-controls')?.getAttribute('data-inputs');
    const arrayRow = JSON.parse(arrayRowJson || '[]') as FormEntryGrouping[];
    const rows = content?.querySelectorAll('table tbody tr');
    let rowCount = rows?.length ?? 0;

    if (0 === arrayRow.length) {
      return;
    }

    const row = FromJson(
      [
        {
          inputType: 'array-row',
          name: 'array-row',
          arrayIndex: rowCount,
          values: arrayRow
        }
      ],
      {} // Since this is a new row, there can't be any settings already for it!
    ).results;

    tableBody.insertAdjacentHTML('beforeend', row);
  }
};

const onFormMouseMove = (event: MouseEvent) => {
  if (false === event.target instanceof HTMLSelectElement && false === event.target instanceof HTMLInputElement) {
    clearTimeout(_timeoutId);
    _timeoutId = 0;
    return;
  }

  if (_timeoutId) {
    return;
  }

  _timeoutId = setTimeout(() => (event.target as HTMLInputElement).reportValidity(), INPUT_VALIDATION_TTY);
};

export const UpdateFormValidators = <FormData extends {}>(
  formElement: HTMLFormElement,
  validations: FormValidatorResults<FormData>
) => {
  // Unmark Invalid inputs
  formElement.querySelectorAll<HTMLInputElement>('input:invalid').forEach(elem => {
    elem?.setCustomValidity('');
  });

  if (true === validations) {
    return;
  }

  Object.entries(validations).forEach(([settingName, error]) => {
    const input = formElement.querySelector(`[name*=${settingName}]`) as HTMLInputElement;

    if (!input) {
      return;
    }

    input.setCustomValidity(error as string);

    // Use browser's `.closest()` to target top form element, that has a child of details, that :has() our input with the settings name. This is a crazy "from me to top to me again" 2-way recursive search 😆
    const topDetails = input.closest(`form > details:has(input[name*=${settingName}])`) as HTMLElement;
    const inFormViewPort = IsInViewPort(input, formElement);
    const inTopDetailsViewPort = IsInViewPort(input, topDetails);

    if (inFormViewPort && inTopDetailsViewPort) {
      input.reportValidity();
    }
  });
};
