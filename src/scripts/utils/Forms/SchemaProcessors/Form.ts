import merge from 'lodash.merge';
import { BuildFormSchema } from '../Builder.js';
import { FormSchema, FormSchemaEntryProcessor, InputTypeEntryMap } from '../types.js';

export class Form implements FormSchemaEntryProcessor {
  protected mapping: InputTypeEntryMap = {};

  get uniqueId() {
    return this.formId;
  }

  constructor(
    protected entries: Readonly<FormSchema>,
    protected formData: Record<string, any>,
    private formId: string
  ) {}

  protected toString(): string {
    const subSchemaResults = BuildFormSchema(this.entries, this.formData);
    this.mapping = merge({}, this.mapping, subSchemaResults.mapping);

    return `
      <form id="#${this.formId}">
        ${subSchemaResults.html}
      </form>
    `;
  }

  process() {
    return {
      html: this.toString(),
      mapping: this.mapping
    };
  }
}
