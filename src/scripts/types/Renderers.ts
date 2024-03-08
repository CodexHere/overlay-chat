/**
 * Types for Renderers
 *
 * @module
 */

import { EventEmitter } from 'events';
import { DisplayContextProvider } from '../ContextProviders/DisplayContextProvider.js';
import { StylesheetsContextProvider } from '../ContextProviders/StylesheetsContextProvider.js';
import { BusManager } from '../Managers/BusManager.js';
import { PluginManager } from '../Managers/PluginManager.js';
import { SettingsManager } from '../Managers/SettingsManager.js';
import { TemplateManager } from '../Managers/TemplateManager.js';

/**
 * Current Render Mode for the Application.
 */
export type RenderMode = 'app' | 'configure';

/**
 * Options for initializing the {@link RendererInstance | `RendererInstance`}.
 */
export type RendererInstanceOptions = {
  bus: BusManager;
  display: DisplayContextProvider;
  plugin: PluginManager;
  settings: SettingsManager;
  stylesheets: StylesheetsContextProvider;
  template: TemplateManager;
};

/**
 * Instance Typing of a Renderer.
 */
export type RendererInstance = EventEmitter & {
  init(): Promise<void>;
};

/**
 * Static Typing of a Renderer Class.
 *
 * > NOTE: A Renderer should have a `constructor` that matches this signature!
 */
export type RendererConstructor = {
  new (options: RendererInstanceOptions): RendererInstance;
};
