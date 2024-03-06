/**
 * Core Events sent throughout the Lifecycle of the Application
 *
 * @module
 */

import { Listener } from 'events';
import { AppBootstrapper } from '../AppBootstrapper.js';
import { PluginManager } from '../Managers/PluginManager.js';
import { EnhancedEventEmitter } from '../utils/EnhancedEventEmitter.js';
import { ContextProviders } from './ContextProviders.js';
import { BusManagerContext_Init } from './Managers.js';
import { PluginImportResults, PluginInstance } from './Plugin.js';
import { RenderMode, RendererInstance } from './Renderers.js';

/**
 * Core Events sent throughout the Lifecycle of the Application.
 */
export enum CoreEvents {
  /** Fired when the {@link AppBootstrapper | `AppBootstrapper`} has Initialized the presenting Renderer based on startup Settings, and after `RendererInstance::PluginsChanged`. */
  RendererStarted = 'AppBootstrapper::RendererStarted',
  /** Fired when all Plugins have been Loaded into the Application. */
  PluginsLoaded = 'PluginManager::PluginsLoaded',
  /** Fired when all Plugins have been Unloaded from the Application. */
  PluginsUnloaded = 'PluginManager::PluginsUnloaded',
  /** Fired when all Plugin List has been changed during Configuration. */
  PluginsChanged = 'RendererInstance::PluginsChanged',
  /** Fired when a Plugin modifies the Settings after `PluginsLoaded` is Fired. Typically this is only during Configuration. */
  SyncSettings = 'Plugin::SyncSettings',
  /** Fired when a Plugin is attempting to Execute a Middleware Chain. */
  MiddlewareExecute = 'Plugin::MiddlewareExecute'
}

/**
 * Options for the RendererStarted Handlers.
 */
export type RendererStartedHandlerOptions = {
  ctx: ContextProviders;
  renderer: RendererInstance;
  renderMode: RenderMode;
};

/**
 * Events that the {@link AppBootstrapper | `AppBootstrapper`} Emits.
 */
export type AppBootstrapperEmitter = AppBootstrapper & {
  emit(eventType: CoreEvents.RendererStarted, options: RendererStartedHandlerOptions): boolean;
  addListener(
    eventType: CoreEvents.RendererStarted,
    listener: (options: RendererStartedHandlerOptions) => void
  ): AppBootstrapperEmitter;
  on(
    eventType: CoreEvents.RendererStarted,
    listener: (options: RendererStartedHandlerOptions) => void
  ): AppBootstrapperEmitter;
};

export type BusManagerEmitter = EnhancedEventEmitter & {
  addListener(
    eventType: CoreEvents.MiddlewareExecute,
    listener: (ctx: BusManagerContext_Init) => void
  ): AppBootstrapperEmitter;
  on(eventType: CoreEvents.MiddlewareExecute, listener: (ctx: BusManagerContext_Init) => void): AppBootstrapperEmitter;

  emit(eventType: CoreEvents.SyncSettings): boolean;
  addListener(eventType: CoreEvents.SyncSettings, listener: Listener): BusManagerEmitter;
  on(eventType: CoreEvents.SyncSettings, listener: Listener): BusManagerEmitter;
};

/**
 * Events that the {@link PluginManager | `PluginManager`} Emits.
 */
export type PluginManagerEmitter = PluginManager & {
  emit(eventType: CoreEvents.PluginsLoaded, importResults: PluginImportResults): boolean;
  addListener(
    eventType: CoreEvents.PluginsLoaded,
    listener: (importResults: PluginImportResults) => void
  ): PluginManagerEmitter;
  on(eventType: CoreEvents.PluginsLoaded, listener: (importResults: PluginImportResults) => void): PluginManagerEmitter;

  emit(eventType: CoreEvents.PluginsUnloaded): boolean;
  addListener(eventType: CoreEvents.PluginsUnloaded, listener: Listener): PluginManagerEmitter;
  on(eventType: CoreEvents.PluginsUnloaded, listener: Listener): PluginManagerEmitter;
};

/**
 * Events that the {@link RendererInstance | `RendererInstance`} Emits.
 */
export type RendererInstanceEmitter = RendererInstance & {
  emit(eventType: CoreEvents.PluginsChanged): boolean;
  addListener(eventType: CoreEvents.PluginsChanged, listener: Listener): RendererInstanceEmitter;
  on(eventType: CoreEvents.PluginsChanged, listener: Listener): RendererInstanceEmitter;
};

/**
 * Events that the {@link PluginInstance | `PluginInstance`} Emits.
 */
export type PluginInstanceEmitter = PluginInstance & {
  emit(eventType: CoreEvents.SyncSettings): boolean;
  addListener(eventType: CoreEvents.SyncSettings, listener: Listener): AppBootstrapperEmitter;
  on(eventType: CoreEvents.SyncSettings, listener: Listener): AppBootstrapperEmitter;

  emit<Context extends {}>(
    eventType: CoreEvents.MiddlewareExecute,
    ctx: (ctx: BusManagerContext_Init<Context>) => void
  ): boolean;
  addListener(eventType: CoreEvents.MiddlewareExecute, listener: Listener): AppBootstrapperEmitter;
  on(eventType: CoreEvents.MiddlewareExecute, listener: Listener): AppBootstrapperEmitter;
};
