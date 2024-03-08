/**
 * Load and Cache TemplateMaps from all Plugins
 *
 * @module
 */

import merge from '@fastify/deepmerge';
import { TemplatesContextProvider } from '../ContextProviders/TemplatesContextProvider.js';
import { LockHolder } from '../types/Managers.js';
import { BuildTemplateMap, TemplateIDsBase, TemplateMap } from '../utils/Templating.js';
import coreTemplate from './coreTemplates.html?raw';

/**
 * Load and Cache {@link TemplateMap | `TemplateMap`}s  from all Plugins.
 */
export class TemplateManager {
  /** Our Context Provider for this Manager. */
  context?: TemplatesContextProvider;

  /** {@link TemplateMap | `TemplateMap`}  Cache of all loaded Template Elements */
  private templates: TemplateMap<TemplateIDsBase> = {} as TemplateMap<TemplateIDsBase>;

  /**
   * Create a new {@link TemplateManager | `TemplateManager`}.
   *
   * @param lockHolder - Instance of {@link LockHolder | `LockHolder`} to evaluate Lock Status.
   */
  constructor(private lockHolder: LockHolder) {}

  /**
   * Initialize the {@link TemplateManager | `TemplateManager`}.
   *
   * Adds core Template to mapping.
   */
  async init() {
    this.addTemplateData(coreTemplate.replace('%PACKAGE_VERSION%', import.meta.env.PACKAGE_VERSION));
    this.context = new TemplatesContextProvider(this.lockHolder, this);
  }

  /**
   * Load all of the Template URLs and append the text values to a single string.
   */
  async loadTemplateData(url: string) {
    let templateData = '';

    // Load all template file url values
    const resp = await fetch(url);
    templateData = await resp.text();

    return templateData;
  }

  /**
   * Add Template data to the {@link TemplateMap | `TemplateMap`}.
   *
   * @param templateData - Template File data as a string to process.
   */
  addTemplateData(templateData: string) {
    // Convert to a Template Delegate mapping
    const templateMap = BuildTemplateMap(templateData);

    // Merge into overall Templates Map
    this.templates = merge()(this.templates, templateMap) as TemplateMap<TemplateIDsBase>;

    return templateMap;
  }

  /**
   * Remove Template and Delegate from Cache by TemplateID.
   *
   * @param id - TemplateID to remove from Cache.
   */
  removeTemplate(id: string): void {
    delete this.templates[id as TemplateIDsBase];
  }

  /**
   * Get the Template Map.
   *
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  get<TemplateIDs extends string>(): TemplateMap<TemplateIDs> {
    return this.templates as TemplateMap<TemplateIDs>;
  }

  /**
   * Get a Template by ID.
   *
   * This ID is the one in the `<template>` tag in the loaded file.
   *
   * @param id - ID of Template to retrieve.
   */
  getId<TemplateIDs extends string>(id: TemplateIDs | TemplateIDsBase): HandlebarsTemplateDelegate<any> {
    return this.templates[id as TemplateIDsBase];
  }
}
