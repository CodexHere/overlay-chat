import { SettingsSchemaPasswordInput } from '../types.js';
import { Button } from './Button.js';
import { SimpleInput } from './SimpleInput.js';

export class PasswordInput extends SimpleInput<SettingsSchemaPasswordInput> {
  override toString(): string {
    const btnPasswdToggle = new Button(
      {
        inputType: 'button',
        label: '👁',
        name: `password-view-${this.entry.name}`
      },
      this.settings
    );

    const btnProcessed = btnPasswdToggle.process();

    return `
      <div class='password-wrapper'>
        ${super.toString()}
        ${btnProcessed.results}
      </div>
    `;
  }
}
