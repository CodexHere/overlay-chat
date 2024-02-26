import { IsInViewPort } from '../DOM.js';
import { GroupingRow } from './SchemaProcessors/Grouping/GroupingRow.js';
import { FormSchemaGrouping, FormValidatorResults } from './types.js';

let _timeoutId = 0;
const INPUT_VALIDATION_TTY = 500;

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
export const onFormChanged = (event: Event) => {
  updateRangeDisplays(event);
  updateRangeValue(event);
};

export const onFormClicked = (event: MouseEvent) => {
  checkButtonsClicked(event);
};

export const initRangeDisplays = (formElement: HTMLFormElement) => {
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
    const arrayRow = JSON.parse(arrayRowJson || '[]') as FormSchemaGrouping[];
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

    tableBody.insertAdjacentHTML('beforeend', rowProcessed.html);
  }
};

export const onFormMouseMove = (event: MouseEvent) => {
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

  Object.entries(validations).forEach(([valueName, error]) => {
    const input = formElement.querySelector(`[name*=${valueName}]`) as HTMLInputElement;

    if (!input) {
      return;
    }

    input.setCustomValidity(error as string);

    // Use browser's `.closest()` to target top form element, that has a child of details, that :has() our input with the value name. This is a crazy "from me to top to me again" 2-way recursive search 😆
    const topDetails = input.closest(`form > details:has(input[name*=${valueName}])`) as HTMLElement;
    const inFormViewPort = IsInViewPort(input, formElement);
    const inTopDetailsViewPort = IsInViewPort(input, topDetails);

    if (inFormViewPort && inTopDetailsViewPort) {
      input.reportValidity();
    }
  });
};
