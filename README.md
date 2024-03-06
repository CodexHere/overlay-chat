# HangoutHere Overlay: Chat

* [LifeCycle Diagram](.github/docs/app_lifecycle.drawio.svg)
* [Events](.github/docs/events.md)

## TODO

### Default Settings Thinkery

* All Inputs
  * Needs REQUIRED set
  * Needs READONLY set
* Single Inputs
  * Default Value - Should be working
* Multi Inputs
  * Needs per-value constraints 
    * Default Value - I don't think exists
    * Readonly
    * Do we maybe take either strings (current implementation) AND we can take `FormSchemaCheckedInput` for `FormSchemaCheckedMultiInput` and `FormSchemaSimpleInput` with `inputType=text` for `FormSchemaSelect`.
      * This could help encapsulate logic for default/readonly
      * Also useful for things like Font Family where the label may be "Comic Sans", but the value should be "comic-sans:400".
* Groupings
  * Default Value - Is this remotely possible????
* Validation Checks
  * Validator Inputs
    * Make sure patterns are right!
  * Required
  * Individual Column in ArrayGroup/List
  * Entire Row for ArrayGroup/List

### General TODO

#### TODO

* Refactor:
  * Forms:
    * For multi-select items, need separation between value/label
    * See info above
    * Default/Required/Readonly Values for both single/multi/group Entries
    * Needs to properly support `<datalist>` - https://developer.mozilla.org/en-US/docs/Web/HTML/Element/datalist
    * Form schema processors should have validation for required properties, just because
  * Thought Experiment: Accessor Function `setSetting('settingName', someValue)`
    * Used to set individual setting
    * Would use the Schema to derive how to inject/select setting
      * i.e., `FormSchemaCheckedMultiInput` would iterate through values and build the expected `selectedIndex:value` setting.
      * i.e., Groupings will probably need some recursion to this?
    * Interface for `RendererInstanceOptions` is getting a bit fat for almost no reason... Another reason to inject Context objects? This already pretty much IS that, but we can group functionality by access (ie, settings vs plugins vs stylesheets, etc).
  * Thought Experiement: Refactor to Contexts:
    * Most Managers need to wrap a `ContextProvider`
      * A `ContextProvider` implements a specific `Context`, such as `SettingsContext`, which houses the primary accessor functionality
      * Accessors will likely need massive renaming.
      * This means make new types for `SettingsContext`, `TemplateContext` etc, make the associative Managers implement them, and build an interface to inject these into the Plugins as a `PluginContext`.
    * On top of all that, we need to probably separate the `Manager` from `Context`. This means `Manager` does App Lifecycle like `init` and such, but `Context` handles Plugin integration points (ie, `ctx.template.register(...)`)
      * All `Context`s should extend EventEmitter but most probably wont emit
      * `TemplateManager`
        * Remove array of URLs and load/build new sub template map, and `merge()` into cache.
        * Context: Need Accessor for individual template!
      * `SettingsManager`
        * Not much of a change. on `init` instantiate a Context and inject the parsed URI params as settings and let it go to town. All existing interface likely just moves over to context.
        * Needs to emit `SETTINGS_STALE` (mentioned elsewhere) on settings changes
          * Maybe another `SCHEMA_STALE` for schema changes?
        * Current Registering of settings injects meta, but assumes meta derives from a registration object that returns a mapping of Middleware Chains and Events, making it easy to dump this stuff as metadata... This may not be as plain and simple if plugins do self-registration.
          * Need to think how to properly list/get middleware chain names and event names
        * I believe ProcessedSchema stays a thing of the SettingsManager, but still needs accessor for `ConfigurationRenderer` to render the form data, etc.
        * Consider making `getSettings` take in an `encrypt: boolean` and getting rid of `getMaskedSettings`
      * `DisplayManager`: Rename `DisplayAccessor` to `DisplayContext` for the type
      * `PluginManager`: No Changes - Not Context material, just a Manager.
      * `BusManager`
        * Thinking through how resetting the Context would work, as it needs to be NOT possible in a Plugin.
        * ChainMap(s) and Emitter instances live in Manager, injected into Context constructor
          * Could still inject Accessor Functions for safety? ie, currently `reset()` rewrites the instance which would break any existing injected data  references.
        * `reset` needs to `map.clear()` instead of create new instances
      * `StyleContext` type and implementation needed to inject and remove stylesheets.
        * Absorb stylesheet removal from `PluginManager::unregisterAllPlugins()`
          * This should be called in lifecycle event handler for `PLUGIN_UNLOAD`
      * Consider building `LifecycleManager` which then houses the event handlers for various manager events. Keeps it tidy and isolated.
    * Ensure registration functions are blocked during runtime!
      * `busManager.disableAddingListeners` should be renamed to just `toggle(enable?:boolean)`
  * Context Finalizing:
    * Make sure Contexts don't expose anything they shouldn't!
      * Double check during JS-runtime we can't access private members/methods!
    * SettingsManager - does it make sense to have some of this logic moved to the Context Provider? Specifically the caching/store/toggleMask/etc?
    * Make sure all Contexts use an API to access Managers, even for adding/removing data.
      * I know this isn't true atm, and needs work.
    * Make sure all Contexts block Registering after registration phase
      * This ensures plugin lifecycle is linear and in-tandem with App Lifecycle
      * This will put a final nail in the coffin about run-time plugin registration, so consider wisely!!!!
        * Do we NEED run-time plugin registration? Currently, NO. But, it could be widely useful in other projects? THINK THINK THINK!
      * If we end up going this route of blocking registration, maybe consider instead injecting a completely different context for runtime versus config time? Will this actually satisfy our needs? Does this then also require splitting implementation, or can we be clever somehow? Ideally the interface isn't the gatekeeper, but the underlying implementation. Someone might be using raw JS and no types, and has no clue that they shouldn't call `register` at runtime, if it's available in the debugger!
  * Bootstrapper
    * -- New train of thought for all this, Core Plugin injects what is now the Core Schema, and THAT has defaults set in it!
    * Change schema to be just an arraylist with columns:
      * Enabled
      * Plugin Name or URL
    * should take in a list of Built-In plugins
    * take in a list of required plugins (built-in, or remote)
      * if matches in the supplied list, needs to be enabled rather than added
    * Consider a way to just combine built-in and remote plugins
  * Settings:
    * Really need to consider how we handle settings atm.
      * Should assuming raw settings are MASKED!
      * This means settings values should be MASKED on SET
        * But not wholesale sets, just set-by-name and merging.
        * Of course, should have ability to disable masking on "set" value.
      * Will likely need a refactor of `ConfigurationRenderer` integration with `SettingsManager` and associative `Context`.
  * Consider adding `debug` and replace `console.log`
    * https://bundlephobia.com/package/debug@4.3.4
    * If we don't add it, remove `console.log`
  * Consider creating a new bg style, or various themes:
    * https://www.joshwcomeau.com/gradient-generator/
* Check Plugin Lifecycle:
  * Errors on Import
  * Errors on RendererStarted (from `LifecycleManager`)
* Core Plugin needs to require Twitch-Chat
  * Need to make sure we have `Twitch - Chat` enabled
  * Maybe this is unnecessary if the process enforces enabling as mentioned in `Refactor > Bootstrapper`
* All Plugins' settings names need prefixes to avoid collissions, as well as updates within their code! This *could* spread to other plugins for a name, so consider a string search before replacing. IE, EmoteSwap checking for Chat options.
* Example Plugin:
  * Needs to mention in description, and add advanced `isConfigured` check for `enabled` items missing a `message`.
  * Convert `Show Error at Runtime?` to Enabled/Message like others.
    * Can we combine them all into one `grouparray`?
* Work on Forms Validator Input types, make sure regexes are REALLY good!
* Add About/FAQ/ETC links on Settings Page
  * How to use it, etc.
  * or should it be a github wiki?
* Create some cool examples:
  * renderConfiguration
    * Hello plugin should re-enable button if text is not `"Hello from the Plugin!"`
    * listen to click of button, show error
      * ?? This could replace the timeout errors
    * Inject a Settings Option:
      * Color Element
      * Changes the `--pico-card-background-color` value to modify settings css!
  * Gamut Settings should be loaded with a plugin?
    * If we refactor Registering to injecting rather than retrieving from a function call, we can possibly even find a way to break the lifecycle from being so rigid? Seemingly should be possible to start and stop plugins at-will. Right now, it's whole-sale/scorched-earth destroy and rebuild.
	* Generally where I come up with ideas and flesh them out before moving into final plugin
		* Just don't delete stuff!!!
	* Custom Chains
		* CHAT!
		* event sub stuff?
		* ElevenLabs TTS Demo: https://codepen.io/CodexHere/pen/GRYXRzY
		* Simple !tts command
	* Event Bus
		* Sound on msg
		* confetti on follow?
		* TTS on eventsub redeem
* Consider making `compressed` the default URL format instead of `uri`.
  * More plugins might expose how large this URL can really get
* Librarify:
  * https://vitejs.dev/guide/build#library-mode
  * Overlay Architecture
  * Form Utils
     * Options to auto convert to array per key
  * URI Serialize/Deserialize
     * Options to auto convert to array per key
  * Library for all Common/Reusable Plugins
* Common Plugin Deploy
  * Twitch - Chat / PubSub, etc
  * OBS WS Proxy
* Write Guides:
  * Application Lifecycle
  * How to Build an Application with COAP
  * How to Build a Plugin for COAP
* Convert to use `hh-util`
  * `hh-util` needs *proper* publishing
  * `hh-util` needs proper lifecycle support
    * Named Volumes for triggers, etc
  * Docker Support
  * Typescript/Build/etc Support normalized
    * Path aliases!
  * Misc configs like prettier normalized

## Application Lifecycle

- BootStrap 
  - Responsible for initializing and maintining the lifecycle of the Application
  - Takes in the initial boot options:
      - Settings Manager
        - Define what it means for Settings to be "Configured"
          - Default "Configured" status is based on having a `channelName` defined.
      - Renderers:
        - Settings
        - Overlay
      - Elements - These are the DOM elements to be injected to Renderers for manipulation
      - Templates - These are `<template>` tags to be injected into Renderers to render
      - Default Plugin - This is the "Core" plugin that loads first in `Priority`
  - `SettingsManager` initialized
    - Load Settings from URI
    - Load Core Settings Schema
  - `PluginManager` initialized
    - Load Plugin instances from `SettingsManager`, or fallback to Default Plugin
    - Inject Plugin stylesheets into `<head>` in DOM
  - Init Plugin Settings from all loaded Plugins
  - App Start
    - Determine if Settings are configured
      - If Configured, `init` the App Renderer
      - If Unconfigured, `init` the Settings Renderer

## Plugins

### Ideas

* Chat Core
* EventSub Core
* PubSub Core
* Example: Event Sub Response:
  * Output simple message (customizable) indicating an event was triggered
  * Needs a tokenized mapping of event sub properties
    * https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelhype_trainbegin
* OBS WS Core
* Chat Animations
  * https://www.minimamente.com/project/magic/
  * https://animate.style/
  * Reveal animation
    * Per Word vs Per Character
  * Remove animation
* SimpleReply
  * Simple mapping of `!command` to "Reply Text"
* Message Playlist
  * Playlist of messages to send at some frequency
  * Do we have multiple timers?
* Ignore Chatter
* Sound Effects - Sound on Message
  * ArrayList of sound urls
  * Checkbox for Randomize
  * Plays in order, or random per message
* Sound Effects - User Entrance
  * TTY for replaying sound
  * ArrayList:
    * Username
    * Sound URL
* Link Replacement
  * Identifies links, replaces with custom Text
    * IE: <img src="https://domain.com/redacted.png">
    * IE: <LINK REDACTED>
    * Have entries for: Streamer | VIP | Mod | Viewer
      * Viewer: <a href="https:link" class="blurred">asdf</a>
      * Mod: <a href="https:link">asdf</a>
* Word replacement
  * Auto Import of public list
  * 2 Inputs:
    * What to find
    * What to replace with
      * Can be empty
* Emoji Replacments (7TV, BTTV)
  * Emoji Themes
* Administrative Actions? (needs auth)
* Chat Box (send as user, needs auth)
* Role Style Adjustments:
  * VIP/Mod/etc get style treatments?
  * This is basically a theme with minimal purpose
  * Might have multiple versions of this theme
* Top Chatter
  * Special Badge?
  * Some kind of color/etc treatment
* Ad Detection
  * Sends Message
  * Needs Auth
* Follower Stuff
  * Border/glow animations?
  * Confetti around follow message in chat?
  * Send message welcoming viewer
* History Plugin:
  * Stores chats in localStorage to be retrieved on load, so chat isn't empty on first load


## NOTES:

Artifacts Token:

```
ACTIONS_RUNTIME_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6dHJ1ZSwic2NwIjoiQWN0aW9ucy5FeGFtcGxlU2NvcGUgQWN0aW9ucy5SZXN1bHRzOmFhYTpiYmIifQ.Byr9QP7Pg1c_P2grEkyHDrG2XdPspFCPvSThK9egAqw
AUTH_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6dHJ1ZSwic2NwIjoiQWN0aW9ucy5FeGFtcGxlU2NvcGUgQWN0aW9ucy5SZXN1bHRzOmFhYTpiYmIifQ.Byr9QP7Pg1c_P2grEkyHDrG2XdPspFCPvSThK9egAqw

# JWT Generation: https://jwt.io/#debugger-io?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6dHJ1ZSwic2NwIjoiQWN0aW9ucy5FeGFtcGxlU2NvcGUgQWN0aW9ucy5SZXN1bHRzOmFhYTpiYmIifQ.Byr9QP7Pg1c_P2grEkyHDrG2XdPspFCPvSThK9egAqw
```


### Get All Fonts on `fonts.bunny.net`
Go to: https://fonts.bunny.net/

Load a ton of fonts on the page.

Run the script:

```js
/// Match/Find all Link Font Values:
const fontValues = document.querySelectorAll('link[rel="stylesheet"]').values().toArray().map(l => l.href.match(/family=(.*)(&|,)/)).splice(4).map(match => match[1]);

// Match/Find all Font Family Names:
const fontNames = document.querySelector('.container:nth-child(2n)').querySelectorAll('.card-main').values().toArray().map(e => e.style.getPropertyValue('font-family').replace(', AdobeBlank', ''));

const selectValues = fontValues.map((value, idx) => ({
  label: fontNames[idx],
  value
}));

const selectValuesJson = JSON.stringify(selectValues);
const blob = new Blob([selectValuesJson], { type: 'application/json' });
const downloadLink = document.createElement('a');
downloadLink.href = URL.createObjectURL(blob);
downloadLink.download = 'data.json';
downloadLink.click();
```
