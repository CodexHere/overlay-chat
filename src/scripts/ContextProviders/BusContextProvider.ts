/**
 * Context Provider for the Application Bus
 *
 * @module
 */

import { BusManager } from '../Managers/BusManager.js';
import { ContextProvider_Bus } from '../types/ContextProviders.js';
import { PluginEventRegistration, PluginInstance, PluginMiddlewareMap } from '../types/Plugin.js';
import { MiddlewareChain, MiddlewareLink } from '../utils/Middleware.js';

type PluginBusMap = {
  events: PluginEventRegistration;
  middleware: PluginMiddlewareMap;
};

/**
 * Context Provider for the Application Bus.
 *
 * Injected at Registration and Runtime for Application Integration/Access.
 */
export class BusContextProvider implements ContextProvider_Bus {
  /**
   * Mapping of Plugin Ref to an Events/Middleware combo map.
   */
  private pluginBusMap: Map<Symbol, PluginBusMap> = new Map();

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
   * Creates new {@link BusContextProvider | `BusContextProvider`}.
   *
   * @param manager - {@link BusManager | `BusManager`} instance for the {@link types/ContextProviders.ContextProvider_Bus | `ContextProvider_Bus`} to act on.
   */
  constructor(private manager: BusManager) {
    this.emit = this.manager.emitter.emit.bind(this.manager.emitter);
    this.call = this.manager.emitter.call.bind(this.manager.emitter);
  }

  /**
   * Unregister a Plugin from the Application.
   *
   * Removes known Registered Listeners, and the registered Links for Chains.
   *
   * @param plugin - Instance of the Plugin to act on.
   */
  unregister(plugin: PluginInstance): void {
    const pluginMap = this.pluginBusMap.get(plugin.ref);

    if (!pluginMap) {
      return;
    }

    // Unregister Events
    Object.entries(pluginMap.events.recieves || {}).forEach(([eventName, eventListener]) =>
      this.manager.emitter.removeListener(eventName, eventListener)
    );

    // Unregister Middleware Links for all Chain Names in the mapping
    Object.entries(pluginMap.middleware || {}).forEach(([chainName, chainLinks]) => {
      const chain = this.manager.chainMap.get(chainName);

      chainLinks.forEach(link => chain?.unuse(link));

      this.manager.chainMap.delete(chainName);
    });

    // Unregister Middleware Name -> Plugin mappings
    for (const [name, pluginRef] of this.manager.pluginMap.entries()) {
      if (pluginRef === plugin.ref) {
        this.manager.pluginMap.delete(name);
      }
    }

    this.pluginBusMap.delete(plugin.ref);
  }

  /**
   * Register Sends/Recieves for Events with the Application.
   *
   * > Events are forcibly added from the given mapping, and will bind to the {@link PluginInstance | `PluginInstance`}.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the Sends/Recieves declarations for the Plugin.
   */
  registerEvents(plugin: PluginInstance, registrationMap: PluginEventRegistration): void {
    // Cache Events mapping
    const pluginMap: PluginBusMap = this.pluginBusMap.get(plugin.ref) || ({} as PluginBusMap);
    pluginMap.events = registrationMap;

    if (registrationMap.recieves) {
      for (const [eventName, eventFunction] of Object.entries(registrationMap.recieves)) {
        // AddListener on behalf of the plugin, and force-bind the function to the PluginInstance
        this.manager.emitter.addListener(eventName, eventFunction.bind(plugin));
      }
    }
  }

  /**
   * Register Middleware Links for Chains with the Application.
   *
   * @param plugin - Instance of the Plugin to act on.
   * @param registrationMap - Registration of the MiddlewareMap declarations for the Plugin.
   */
  registerMiddleware(plugin: PluginInstance, registrationMap: PluginMiddlewareMap): void {
    for (const [middlewareName, middlewareLinks] of Object.entries(registrationMap)) {
      //! FIXME: Should be done through API, not direct access!
      let chosenChain = this.manager.chainMap.get(middlewareName);

      // This is the first registration for the Chain
      if (!chosenChain) {
        // Create a new Chain to be chosen
        chosenChain = new MiddlewareChain();
        // Register this plugin as the leader for this Chain
        this.manager.pluginMap.set(middlewareName, plugin.ref);
        // Register this Chain for the middlewareName
        this.manager.chainMap.set(middlewareName, chosenChain);

        console.info(`Registering '${plugin.name}' as leader of Chain: ${middlewareName}`);
      }

      chosenChain.use(...middlewareLinks);
    }

    // Register each MiddlewareChain with an Error MiddlewareLink
    for (const chain of this.manager.chainMap.values()) {
      chain.use(this.errorMiddlewareLink);
    }
  }

  /**
   * Error Handling {@link MiddlewareLink | `MiddlewareLink`}.
   *
   * This Handler is added to the end of every {@link MiddlewareChain | `MiddlewareChain`}
   * upon Registration, and as such is treated as an "Error Handler" for the entire Chain.
   * You can compare this to a `Promise.catch()`.
   *
   * @param _context - (Ignored) Contextual State passed from Link to Link.
   * @param next - `Next` function to call in order to progress Chain.
   * @param error - If supplied, the entire Chain is in Error.
   */
  private errorMiddlewareLink: MiddlewareLink = async (_context, next, error) => {
    if (error) {
      throw error;
    } else {
      await next();
    }
  };
}
