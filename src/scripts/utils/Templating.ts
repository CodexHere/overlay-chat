import Handlebars from 'handlebars';

const DomParser = new DOMParser();

export type TemplateMap = Record<string, HandlebarsTemplateDelegate<any>>;

export const BuildTemplateMap = async (templateData: string) => {
  const DomParser = new DOMParser();
  const newDocument = DomParser.parseFromString(templateData, 'text/html');
  const templates = [...newDocument.querySelectorAll('template')];

  const templateMap = templates.reduce((templates, templateElement) => {
    templates[templateElement.id] = PrepareTemplate(templateElement);
    return templates;
  }, {} as TemplateMap);

  return templateMap;
};

export const PrepareTemplate = (templateElement: HTMLElement) =>
  Handlebars.compile(templateElement.innerHTML, { noEscape: true });

export const RenderTemplate = (container: HTMLElement, template: Handlebars.TemplateDelegate, data = {}) => {
  if (!template) {
    return;
  }

  const renderedTemplate = template(data);

  // Parse the rendered template as HTML
  const newDocument = DomParser.parseFromString(renderedTemplate, 'text/html');
  const { firstChild: childToAppend } = newDocument.body;

  if (!container || !childToAppend) {
    return;
  }

  // Inject the HTML into the container
  container.appendChild(childToAppend);
};
