import { BuildTemplateMap, TemplateMap } from '../utils/Templating.js';
import coreTemplate from './coreTemplates.html?raw';

export class TemplateManager {
  private templateUrls: URL[] = [];
  private templates: TemplateMap = {};

  getTemplates = () => this.templates;

  registerTemplates = async (templateUrl?: URL) => {
    if (!templateUrl) {
      return;
    }

    this.templateUrls.push(templateUrl);
  };

  async init() {
    const templateData = await this.loadTemplateData();
    this.templates = await BuildTemplateMap(templateData);
  }

  private async loadTemplateData() {
    let templateData = coreTemplate;

    // Load all template file url values
    for (const url of this.templateUrls) {
      const resp = await fetch(url.href);
      templateData += await resp.text();
    }

    templateData = templateData.replace('%PACKAGE_VERSION%', import.meta.env.PACKAGE_VERSION);

    return templateData;
  }
}
