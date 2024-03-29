/**
 * Load and Cache TemplateMaps from all Plugins
 *
 * @module
 */

import merge from 'lodash.merge';
import { TemplatesContextProvider } from '../ContextProviders/TemplatesContextProvider.js';
import { BuildTemplateMap, TemplateIDsBase, TemplateMap } from '../utils/Templating.js';
import coreTemplate from './coreTemplates.html?raw';

/**
 * Load and Cache {@link TemplateMap | `TemplateMap`}s  from all Plugins.
 */
export class TemplateManager {
  /** Our Context Provider for this Manager. */
  context?: TemplatesContextProvider;

  /** {@link TemplateMap | `TemplateMap`}  Cache of all loaded Template Elements */
  templates: TemplateMap<TemplateIDsBase> = {} as TemplateMap<TemplateIDsBase>;

  /**
   * Initialize the {@link TemplateManager | `TemplateManager`}.
   *
   * Adds core Template to mapping.
   */
  async init() {
    this.addTemplateData(coreTemplate.replace('%PACKAGE_VERSION%', import.meta.env.PACKAGE_VERSION));
    this.context = new TemplatesContextProvider(this);
  }

  /**
   * Load all of the Template URLs and append the text values to a single string.
   */
  async loadTemplateData(url: string) {
    let templateData = '';

    // Load all template file url values
    const resp = await fetch(url);
    templateData = await resp.text();
    templateData = templateData.replace('%PACKAGE_VERSION%', import.meta.env.PACKAGE_VERSION);

    return templateData;
  }

  addTemplateData(templateData: string) {
    // Convert to a Template Delegate mapping
    const templateMap = BuildTemplateMap(templateData);

    // Merge into overall Templates Map
    merge(this.templates, templateMap);

    return templateMap;
  }
}
