import { FormSchemaPasswordInput } from '../../types.js';
import { Button } from './Button.js';
import { SimpleInput } from './SimpleInput.js';

export class PasswordInput extends SimpleInput<FormSchemaPasswordInput> {
  override toString(): string {
    const btnPasswdToggle = new Button(
      {
        inputType: 'button',
        label: '👁',
        name: `password-view-${this.entries.name}`
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
