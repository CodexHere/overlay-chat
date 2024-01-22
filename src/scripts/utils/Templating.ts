import Handlebars from 'handlebars';

const DomParser = new DOMParser();

export const PrepareTemplate = (templateId: string) =>
  Handlebars.compile(document.getElementById(templateId)?.innerHTML, { noEscape: true });

export const RenderTemplate = (container: HTMLElement, template: Handlebars.TemplateDelegate, data = {}) => {
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
