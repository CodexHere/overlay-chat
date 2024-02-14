import Handlebars from 'handlebars';

export type TemplateMap<TemplateIDs extends string> = Record<TemplateIDs, HandlebarsTemplateDelegate<any>>;

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

export const PrepareTemplate = (templateElement: HTMLElement) =>
  Handlebars.compile(templateElement.innerHTML, { noEscape: true });

export const RenderTemplate = (container: HTMLElement, template: Handlebars.TemplateDelegate, data = {}) => {
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
