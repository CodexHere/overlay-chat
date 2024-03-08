/**
 * Context Provider for the Application Bus
 *
 * @module
 */

import { BusManager } from '../Managers/BusManager.js';
import { ContextProvider_Bus } from '../types/ContextProviders.js';
import { PluginEventRegistration, PluginInstance, PluginMiddlewareMap } from '../types/Plugin.js';

/**
 * Context Provider for the Application Bus.
 *
 * Injected at Registration and Runtime for Application Integration/Access.
 */
export class BusContextProvider implements ContextProvider_Bus {
  /** {@link Managers/BusManager.BusManager | `BusManager`} instance for the {@link types/ContextProviders.ContextProvider_Bus | `ContextProvider_Bus`} to act on. */
  #manager: BusManager;

  /**
   * Proxy `call` to the Application Emitter.
   *
   * Unlike your standard `emit`, this will attempt to capture the responses of all handlers and return them!
   * This is pretty hacky, but could be useful.
   *
   * @param type - Event Type to `call`.
   * @param args - Arguments to pass to the Event Listener.
   * @typeParam ReturnType - Expected return type, assuming all callback returns are homogenous.
   */
  call: <ReturnType>(type: string | number, ...args: any[]) => ReturnType[];

  /**
   * Proxy `emit` to the Application Emitter.
   *
   * @param type - Event Type to `call`.
   * @param args - Arguments to pass to the Event Listener.
   */
  emit: (type: string | number, ...args: any[]) => boolean;

  /**
   * Register Middleware Links for Chains with the Application.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the MiddlewareMap declarations for the Plugin.
   */
  registerMiddleware: (plugin: PluginInstance, registrationMap: PluginMiddlewareMap) => void;

  /**
   * Register Sends/Recieves for Events with the Application.
   *
   * > Events are forcibly added from the given mapping, and will bind to the {@link PluginInstance | `PluginInstance`}.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the Sends/Recieves declarations for the Plugin.
   */
  registerEvents: (plugin: PluginInstance, registrationMap: PluginEventRegistration) => void;

  /**
   * Unregister a Plugin from the Application.
   *
   * Removes known Registered Listeners, and the registered Links for Chains.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister: (plugin: PluginInstance) => void;

  /**
   * Creates new {@link BusContextProvider | `BusContextProvider`}.
   *
   * @param manager - {@link Managers/BusManager.BusManager | `BusManager`} instance for the {@link types/ContextProviders.ContextProvider_Bus | `ContextProvider_Bus`} to act on.
   */
  constructor(manager: BusManager) {
    this.#manager = manager;

    this.emit = this.#manager.emitter.emit.bind(this.#manager.emitter);
    this.call = this.#manager.emitter.call.bind(this.#manager.emitter);
    this.registerMiddleware = this.#manager.registerMiddleware.bind(this.#manager);
    this.registerEvents = this.#manager.registerEvents.bind(this.#manager);
    this.unregister = this.#manager.unregister.bind(this.#manager);
  }
}
