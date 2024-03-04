/**
 * Types for Renderers
 *
 * @module
 */

import { EventEmitter } from 'events';
import { DisplayContextProvider } from '../ContextProviders/DisplayContextProvider.js';
import { PluginManager } from '../Managers/PluginManager.js';
import { SettingsManager } from '../Managers/SettingsManager.js';
import { TemplateManager } from '../Managers/TemplateManager.js';

/**
 * Events that the {@link SettingsManager | `SettingsManager`} Emits.
 */
export enum RendererInstanceEvents {
  /** Fired when Plugin List has been modified */
  PLUGINS_STALE = 'rendererinstance::plugins-stale'
}

/**
 * Options for initializing the {@link RendererInstance | `RendererInstance`}.
 */
export type RendererInstanceOptions = {
  template: TemplateManager;
  settings: SettingsManager;
  plugin: PluginManager;
  display: DisplayContextProvider;
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
