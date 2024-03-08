/**
 * FormSchemaPasswordInput Processor
 *
 * @module
 */

import { FormSchemaPasswordInput } from '../../types.js';
import { BaseFormSchemaProcessor } from '../BaseFormSchemaProcessor.js';
import { Button } from './Button.js';

/**
 * {@link FormSchemaPasswordInput | `FormSchemaPasswordInput`} Processor.
 *
 * Outputs HTML Input Tag with Password/Text Toggle Button for UX interactions.
 */
export class PasswordInput extends BaseFormSchemaProcessor<FormSchemaPasswordInput> {
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
