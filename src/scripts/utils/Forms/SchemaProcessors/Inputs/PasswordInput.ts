/**
 * FormSchemaPasswordInput Processor
 *
 * @module
 */

import { FormSchemaPasswordInput } from '../../types.js';
import { Button } from './Button.js';
import { SimpleInput } from './SimpleInput.js';

/**
 * {@link FormSchemaPasswordInput | `FormSchemaPasswordInput`} Processor.
 *
 * Outputs HTML Input Tag with Password/Text Toggle Button for UX interactions.
 */
export class PasswordInput extends SimpleInput<FormSchemaPasswordInput> {
  override toString(): string {
    const btnPasswdToggle = new Button(
      {
        inputType: 'button',
        label: '👁',
        name: `password-view-${this.entry.name}`
      },
      this.formData
    );

    const btnProcessed = btnPasswdToggle.process();

    return `
      <div class='password-wrapper'>
        ${super.toString()}
        ${btnProcessed.html}
      </div>
    `;
  }
}
