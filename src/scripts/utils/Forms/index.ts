import merge from 'lodash.merge';
import set from 'lodash.set';
import { IsInViewPort } from '../DOM.js';
import { IsValidValue } from '../misc.js';
import { Button } from './Inputs/Button.js';
import { CheckedInput } from './Inputs/CheckedInput.js';
import { CheckedMultiInput } from './Inputs/CheckedMultiInput.js';
import { GroupArray } from './Inputs/GroupArray.js';
import { GroupList } from './Inputs/GroupList.js';
import { GroupSubSchema } from './Inputs/GroupSubSchema.js';
import { GroupingRow } from './Inputs/GroupingRow.js';
import { InputWrapper } from './Inputs/InputWrapper.js';
import { MinMaxInput, RangeInput } from './Inputs/MinMaxInput.js';
import { PasswordInput } from './Inputs/PasswordInput.js';
import { SelectInput } from './Inputs/SelectInput.js';
import { SimpleInput } from './Inputs/SimpleInput.js';
import { ValidatedInput } from './Inputs/ValidatedInput.js';
import {
  FormValidatorResults,
  ProcessedJsonResults,
  SettingsSchemaEntry,
  SettingsSchemaGrouping,
  SettingsSchemaProcessorConstructor
} from './types.js';

let _timeoutId = 0;

const INPUT_VALIDATION_TTY = 500;

export const FromJson = <Settings extends {}>(
  entries: Readonly<SettingsSchemaEntry[]>,
  settings: Settings
): ProcessedJsonResults => {
  let results: ProcessedJsonResults = {
    results: '',
    mapping: {}
  } as ProcessedJsonResults;

  for (let entryIdx = 0; entryIdx < entries.length; entryIdx++) {
    const entry = entries[entryIdx];

    if (!entry.name) {
      throw new Error('FormEntry does not have a `name` property! ' + JSON.stringify(entry));
    }

    let processorCtor: SettingsSchemaProcessorConstructor | undefined;

    /**
     * Settings Schema Processor Selection
     */
    switch (entry.inputType) {
      // Button
      case 'button':
        processorCtor = Button as SettingsSchemaProcessorConstructor;
        break;

      // PasswordInput
      case 'password':
        processorCtor = PasswordInput as SettingsSchemaProcessorConstructor;
        break;

      // SimpleInput
      case 'color':
      case 'file':
      case 'hidden':
      case 'search':
      case 'text':
        processorCtor = SimpleInput as SettingsSchemaProcessorConstructor;
        break;

      // CheckedInput
      case 'radio-option':
      case 'switch':
      case 'checkbox':
        processorCtor = CheckedInput as SettingsSchemaProcessorConstructor;
        break;

      // ValidatedInput
      case 'email':
      case 'tel':
      case 'url':
        processorCtor = ValidatedInput as SettingsSchemaProcessorConstructor;
        break;

      // RangeInput | MinMaxInput
      case 'range':
      case 'number':
      case 'date':
      case 'datetime-local':
      case 'month':
      case 'time':
      case 'week':
        const minMaxInput = 'range' === entry.inputType ? RangeInput : MinMaxInput;
        processorCtor = minMaxInput as SettingsSchemaProcessorConstructor;
        break;

      // CheckedMultiInput
      case 'radio':
      case 'checkbox-multiple':
      case 'switch-multiple':
        processorCtor = CheckedMultiInput as unknown as SettingsSchemaProcessorConstructor;
        break;

      // SelectInput
      case 'select':
      case 'select-multiple':
        processorCtor = SelectInput as unknown as SettingsSchemaProcessorConstructor;
        break;

      // Grouping
      case 'group-subschema':
      case 'grouplist':
      case 'grouparray':
        const groupCtor = {
          grouparray: GroupArray,
          grouplist: GroupList,
          'group-subschema': GroupSubSchema
        }[entry.inputType];

        processorCtor = groupCtor as unknown as SettingsSchemaProcessorConstructor;
        break;

      // noop - This is required or Typescript complains about the case in the
      // following `switch` block not being a matching type.
      case 'grouprow':
        break;

      // Invalid InputType!
      default:
        const brokenItem = entry as any;
        throw new Error(
          `Invalid SettingsSchemaEntry::inputType in Schema for "${brokenItem.name ?? brokenItem.label}": ${brokenItem.inputType}`
        );
    }

    const processor = new processorCtor!(entry, settings);
    const processed = processor.process();

    /**
     * Label Wrapping
     */
    switch (entry.inputType) {
      case 'button':
      case 'group-subschema':
      case 'grouplist':
      case 'grouparray':
      case 'grouprow':
        // noop
        break;

      default:
        const wrapper = new InputWrapper(entry, settings, processed.results, processor);
        processed.results = wrapper.process().results;
        break;
    }

    // Accumulate iterative results
    results = merge({}, results, {
      results: results.results + processed.results,
      mapping: {
        ...results.mapping,
        ...processed.mapping
      }
    });
  }

  return results;
};

export const Hydrate = (form: HTMLFormElement, formData: Record<string, any>) => {
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
    const arrayRow = JSON.parse(arrayRowJson || '[]') as SettingsSchemaGrouping[];
    const rows = content?.querySelectorAll('table tbody tr');
    let rowCount = rows?.length ?? 0;

    if (0 === arrayRow.length) {
      return;
    }

    const row = new GroupingRow(
      {
        inputType: 'grouprow',
        name: 'grouprow',
        arrayIndex: rowCount,
        values: arrayRow
      },
      {}
    );

    const rowProcessed = row.process();

    tableBody.insertAdjacentHTML('beforeend', rowProcessed.results);
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
