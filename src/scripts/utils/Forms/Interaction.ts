/**
 * Interaction/UX Helpers useful for most generated Forms
 *
 * @module
 */

import { IsInViewPort } from '../DOM.js';
import { GroupingRow } from './SchemaProcessors/Grouping/GroupingRow.js';
import { FormSchemaGrouping, FormValidatorResults } from './types.js';

let _timeoutId = 0;
const INPUT_VALIDATION_TTY = 500;

/**
 * Bind Interaction Events for a Form to handle common UX behaviors.
 *
 * @param formElement - HTML Form Element for Events to bind.
 */
export const BindInteractionEvents = (formElement?: HTMLFormElement) => {
  if (!formElement) {
    return;
  }

  formElement.addEventListener('input', onFormChanged);
  formElement.addEventListener('click', onFormClicked);
  formElement.addEventListener('mousemove', onFormMouseMove);

  initRangeDisplays(formElement);
};

/**
 * Unbind Interaction Events from a Form that handle common UX behaviors.
 *
 * @param formElement - HTML Form Element for Events to unbind.
 */
export const UnbindInteractionEvents = (formElement?: HTMLFormElement) => {
  if (!formElement) {
    return;
  }

  formElement.removeEventListener('input', onFormChanged);
  formElement.removeEventListener('click', onFormClicked);
  formElement.removeEventListener('mousemove', onFormMouseMove);
};

/**
 * Event Handler for when the Form Changes.
 *
 * > NOTE: Delegates processing to other methods.
 *
 * @param event - Form Changed Event.
 */
export const onFormChanged = (event: Event) => {
  updateRangeDisplays(event);
  updateRangeValue(event);
};

/**
 * Event Handler for when the Form is Clicked.
 *
 * > NOTE: Delegates processing to other methods.
 *
 * @param event - Form Mouse Event.
 */
export const onFormClicked = (event: MouseEvent) => {
  checkButtonsClicked(event);
};

/**
 * Initializes found Ranges and updates the associated "Display" for each one.
 *
 * @param formElement - HTML Form which to Init Range Displays.
 */
export const initRangeDisplays = (formElement: HTMLFormElement) => {
  // prettier-ignore
  formElement
    .querySelectorAll<HTMLInputElement>('input[type="range"]')
    .forEach(updateRangeDisplay);
};

/**
 * Update Range Displays if necessary.
 *
 * Called when the Form Changes.
 *
 * @param event - Form Changed Event.
 */
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

/**
 * Updates Range Value based on associative "Display" Value.
 *
 * Called when the Form Changes.
 *
 * @param event - Form Changed Event.
 */
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

/**
 * Updates Range "Display" Value based on associative Value.
 *
 * @param range - Which Range Element to get value from.
 */
const updateRangeDisplay = (range: HTMLInputElement) => {
  const rangeDisplay = range.closest('.range-wrapper ')?.querySelector('.range-display') as HTMLInputElement;
  rangeDisplay.value = range.value;
};

/**
 * Handles Common Button Clicks.
 *
 * * Password Views get a toggle button to change between text/password
 * inputs to reveal password value to User.
 * * Add Entry for `GroupList` adds a new Entry based on stored JSON string.
 *
 * @param event - Form Mouse Event
 */
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

/**
 * Toggle between Password and Text input type to expose value to User.
 *
 * @param event - Form Mouse Event
 * @param btn - Button Clicked
 */
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

/**
 * Adds new Entry to `GroupList` by extracting the Schema from the
 * `arraylist-controls` that holds a JSON string of said Schema.
 *
 * @param event - Form Mouse Event
 * @param btn - Button Clicked
 */
const manageArrayGroupEntries = (event: MouseEvent, btn: HTMLButtonElement) => {
  event.preventDefault();
  event.stopImmediatePropagation();

  const isAdd = btn.name.startsWith('add');
  const content = btn.closest('.content');
  const tableBody = content?.querySelector('table tbody');

  // No Table to inject into? Bail!
  if (!tableBody) {
    return;
  }

  // Remove Button was clicked
  if (false === isAdd) {
    // Get last child (if one exists) and have it remove itself
    const lastChild = [...tableBody.children][tableBody.children.length - 1];
    lastChild?.remove();
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
        subSchema: arrayRow
      },
      {},
      {}
    );

    const rowProcessed = row.process();

    tableBody.insertAdjacentHTML('beforeend', rowProcessed.html);
  }

  if (event.currentTarget instanceof HTMLFormElement) {
    event.currentTarget.dispatchEvent(new InputEvent('input'));
  }
};

/**
 * Event Handler for Mouse Movement on the Form.
 *
 * Essentially this allows for handling Form Input Validity reporting
 * similar to how Tooltips work. Hover over an input for n-seconds, and
 * the input will show it's Validity.
 *
 * This is a convenience UX/hack for showing Input validation errors
 * after they've been removed by losing focus.
 *
 * @param event - Form Mouse Event
 */
export const onFormMouseMove = (event: MouseEvent) => {
  // If we mouse over any non-Validating Element, consider that we moved
  // off/away from a Validating Element and no longer need to
  // force reporting validity.
  if (false === event.target instanceof HTMLSelectElement && false === event.target instanceof HTMLInputElement) {
    clearTimeout(_timeoutId);
    _timeoutId = 0;
    return;
  }

  // Already waiting on a Validtion Report, noop out...
  if (_timeoutId) {
    return;
  }

  // Wait for TTY to then call `reportValidity` on our Input!
  _timeoutId = setTimeout(() => (event.target as HTMLInputElement).reportValidity(), INPUT_VALIDATION_TTY);
};

/**
 * Clears all existing Validation states, then applies new Validation
 * based on results of either HTML5 Validation, or adhoc expressed
 * Validation within an Application.
 *
 * @param formElement - HTML Form Element to update all Validations on.
 * @param validations - Results from processing the Form's Validations.
 */
export const UpdateFormValidators = <FormData extends {}>(
  formElement: HTMLFormElement,
  validations: FormValidatorResults<FormData>
) => {
  // Unmark Invalid inputs
  // prettier-ignore
  formElement
    .querySelectorAll<HTMLInputElement>('input:invalid')
    .forEach(elem => elem?.setCustomValidity(''));

  if (true === validations) {
    return;
  }

  Object.entries(validations).forEach(([valueName, error]) => {
    // All `valueName`s are always treated as Single Inputs, even if they're truly an array of values.
    const input = formElement.querySelector(`[name*=${valueName}]`) as HTMLInputElement;

    if (!input) {
      return;
    }

    // Set supplied error string as validity message
    input.setCustomValidity(error as string);

    // Use browser's `.closest()` to target top form element, that has a child of details, that :has() our input with the value name. This is a crazy "from me to top to me again" 2-way recursive search 😆
    const topDetails = input.closest(`form > details:has(input[name*=${valueName}])`) as HTMLElement;
    const inFormViewPort = IsInViewPort(input, formElement);
    const inTopDetailsViewPort = IsInViewPort(input, topDetails);

    // If the Input is visible to the user, call `reportValidity`.
    // Checking first ensures that we're not causing weird UI glitches
    // as the browser may overlap these on the display when they should be
    // invisible to the User.
    if (inFormViewPort && inTopDetailsViewPort) {
      input.reportValidity();
    }
  });
};
