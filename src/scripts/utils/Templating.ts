/**
 * Helpers for parsing, mapping, and processing Templates and injecting into DOM
 *
 * @module
 */

import Handlebars from 'handlebars';

/**
 * Mapping of a `templateId` -> `HandlebarsTemplateDelegate` Function.
 *
 * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
 */
export type TemplateMap<TemplateIDs extends string> = Record<TemplateIDs, HandlebarsTemplateDelegate<any>>;

/**
 * Generate a {@link TemplateMap | `TemplateMap`} from a string of HTML Template Tags.
 *
 * @param templateData - HTML as a string, containing `<template>` tags to build a {@link TemplateMap | `TemplateMap`}.
 * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
 */
export const BuildTemplateMap = async <TemplateIDs extends string>(templateData: string) => {
  const DomParser = new DOMParser();
  const newDocument = DomParser.parseFromString(templateData, 'text/html');
  const templates = [...newDocument.querySelectorAll('template')];

  const templateMap = templates.reduce((templates, templateElement) => {
    templates[templateElement.id as TemplateIDs] = PrepareTemplate(templateElement);
    return templates;
  }, {} as TemplateMap<TemplateIDs>);

  return templateMap;
};

/**
 * Compiles an HTML Template Element into a `HandlebarsTemplateDelegate` Function.
 *
 * @param templateElement - HTML Element to derive the Template contents.
 */
export const PrepareTemplate = (templateElement: HTMLTemplateElement) =>
  Handlebars.compile(templateElement.innerHTML, { noEscape: true });

/**
 * Renders a Template to a Container with given Data for template tokenizing.
 *
 * @param container - Element that the generated content should be inserted into.
 * @param template - The {@link https://github.com/handlebars-lang/handlebars.js/blob/master/types/index.d.ts#L24 | `TemplateDelegate`} that we want to generate to HTML.
 * @param data - The object to inject into the Template for runtime tokenizing.
 */
export const RenderTemplate = (
  container: HTMLElement,
  template: Handlebars.TemplateDelegate,
  data: Record<string, any> = {}
) => {
  if (!template) {
    return;
  }

  const renderedTemplate = template(data);

  // Parse the rendered template as HTML
  const DomParser = new DOMParser();
  const newDocument = DomParser.parseFromString(renderedTemplate, 'text/html');
  const { firstChild: childToAppend } = newDocument.body;

  if (!container || !childToAppend) {
    return;
  }

  // Inject the HTML into the container
  container.appendChild(childToAppend);
};
