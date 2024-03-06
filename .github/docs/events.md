# LifeCycle Events:

LifeCycle Events are emitted in two different contexts: Internal communication, and Plugin communication.

> Event Names combine the "Source" and "Event Name" into a single string with the form: `Source::EventName`.
> Example: `"PluginManager::PluginsLoaded"`

* Events with the Scope of `Internal` (listed below) are directly emitted-from the "Source".
* Events with the Scope of `Plugin` (listed below) are directly emitted-from a `PluginInstance` on the `BusManager::emitter`, by way of `ContextProvider_Bus::emit`.
* Events with *multiple* Scopes are directional from A -> B.

| Source           | Event Name        | Scope                                        | Note                                                                                                                                                                                                                                               |
| ---------------- | ----------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PluginManager    | PluginsLoaded     | Internal -> Internal                         | Called after *all* Plugins are Loaded to show Import Errors, and initialize the Bus.                                                                                                                                                               |
| PluginManager    | PluginsUnloaded   | Internal -> Internal                         | Called after *all* Plugins are Unloaded, which resets the environment (mostly resetting the Bus).                                                                                                                                                  |
| AppBootstrapper  | RendererStart     | Internal -> Internal<br />Internal -> Plugin | Signifies a Renderer has started in some `<mode>`.<blockquote>Plugins should listen to this and do their kick offs.</blockquote><blockquote>Event is fired after a `RendererInstance::init()` is called.                                           |
| RendererInstance | PluginsChanged    | Internal                                     | Called while Configuring, when the Settings have changed to add/remove Plugins.<blockquote>This should only occur in `configure` Render Mode from the `ConfigurationRenderer`.</blockquote>                                                        |
| Plugin           | SyncSettings      | Plugin -> Internal                           | Called by a Plugin when it updates Form/Settings Data for the User (i.e., Auth Flows, etc).<blockquote>Handled by the `ConfigurationRenderer`.</blockquote>                                                                                        |
| Plugin           | MiddlewareExecute | Plugin -> Internal                           | Called from a Plugin when it wants to execute a Middleware Chain.<blockquote>Note: Only the *first* Plugin to Register against the Chain Name will be able to Execute the Chain.</blockquote><blockquote>Handled by the `BusManager`.</blockquote> |
