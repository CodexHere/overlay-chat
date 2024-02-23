/**
 * Load and Cache TemplateMaps from all Plugins
 *
 * @module
 */

import { BuildTemplateMap, TemplateMap } from '../utils/Templating.js';
import coreTemplate from './coreTemplates.html?raw';

/**
 * Base Template IDs available to an Application.
 */
export type TemplateIDsBase = 'modalMessage' | 'app' | 'settings';

/**
 * Load and Cache {@link TemplateMap | `TemplateMap`}s  from all Plugins.
 *
 * This class is also part of the {@link types/Plugin.PluginRegistrar | `PluginRegistrar`},
 * providing various Registration points.
 */
export class TemplateManager {
  /** All URLs to Template HTML files to Load */
  private templateUrls: URL[] = [];
  /** {@link TemplateMap | `TemplateMap`}  Cache of all loaded Template Elements */
  private templates: TemplateMap<string> = {} as TemplateMap<string>;

  /**
   * Accessor Function for getting {@link TemplateMap | `TemplateMap`}
   *
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  getTemplates = <TemplateIDs extends string>() => this.templates as TemplateMap<TemplateIDs>;

  /**
   * Register a Template HTML file with the sytem.
   *
   * @param templateUrl - URL of the Template HTML file to Register.
   */
  registerTemplates = (templateUrl?: URL) => {
    if (!templateUrl) {
      return;
    }

    this.templateUrls.push(templateUrl);
  };

  /**
   * Initialize the `TemplateManager`.
   *
   * This performs the actual loading of the Template Data, and building the {@link TemplateMap | `TemplateMap`}.
   */
  async init() {
    const templateData = await this.loadTemplateData();
    this.templates = await BuildTemplateMap(templateData);
  }

  /**
   * Load all of the Template URLs and append the text values to a single string.
   */
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
