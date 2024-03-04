/**
 * Context Provider for Templates
 *
 * @module
 */

import { TemplateManager } from '../Managers/TemplateManager.js';
import { ContextProvider_Template } from '../types/ContextProviders.js';
import { PluginInstance } from '../types/Plugin.js';
import { TemplateIDsBase, TemplateMap } from '../utils/Templating.js';

/**
 * Context Provider for Templates.
 *
 * > Once Registered, the `<template>` tags are processed into HandleBars Template Delegates.
 */
export class TemplatesContextProvider implements ContextProvider_Template {
  /** A Mapping of our {@link PluginInstance.ref | `Plugin.ref`} */
  private pluginMap: Map<Symbol, string[]> = new Map();

  /**
   * Creates new {@link TemplatesContextProvider | `TemplatesContextProvider`}.
   *
   * @param manager - {@link TemplateManager | `TemplateManager`} instance for the {@link types/ContextProviders.ContextProvider_Template | `ContextProvider_Template`} to act on.
   */
  constructor(private manager: TemplateManager) {}

  /**
   * Unregister a Plugin from the Application.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void {
    const templateIds = this.pluginMap.get(plugin.ref);

    // Remove the template IDs for the Plugin.
    templateIds?.forEach(id => delete this.manager.templates[id as TemplateIDsBase]);

    // Delete the template mapping now that all Templates are unregistered.
    this.pluginMap.delete(plugin.ref);
  }

  /**
   * Registers a Template File for a Plugin.
   *
   * > The file should be `<template>` tags with IDs to be mapped as ID -> Template Delegate.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param styleSheetUrl - URL of the Stylesheet to load.
   */
  async register(plugin: PluginInstance, templateUrl: URL): Promise<void> {
    // Load Template Data
    const templateData = await this.manager.loadTemplateData(templateUrl.href);
    const templateMap = this.manager.addTemplateData(templateData);
    // Store a mapping from our Plugin -> Template IDs for Unregistering
    this.pluginMap.set(plugin.ref, Object.keys(templateMap));
  }

  /**
   * Get the Template Map.
   *
   * @typeParam TemplateIDs - Union Type of accepted `TemplateIDs`.
   */
  get<TemplateIDs extends string>(): TemplateMap<TemplateIDs> {
    return this.manager.templates as TemplateMap<TemplateIDs>;
  }

  /**
   * Get a Template by ID.
   *
   * This ID is the one in the `<template>` tag in the loaded file.
   *
   * @param id - ID of Template to retrieve.
   */
  getId<TemplateIDs extends string>(id: TemplateIDs | TemplateIDsBase): HandlebarsTemplateDelegate<any> {
    return this.manager.templates[id as TemplateIDsBase];
  }
}
