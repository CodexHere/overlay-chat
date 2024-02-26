# HangoutHere Overlay: Chat

## TODO

* Refactor:
  * Finalize FOCUS MODE
  * Forms - should use clases to generate output, consider design patterns (Builder, Visitor)
    * BUGS After Refactor:
      * Passwords aren't being masked anymore???? I think my processed json mapping responses are wrong
      * <Labels> are showing in rows again...
        * Find old/broken CSS and remove or adapt
        * Don't forget that checkboxes/radio's need to keep their labels
      * Adding new Items in an GroupList isn't working
      * CSS Needs Love:
        * Invalid Form Elements - Focus/Unfocused
        * Spacing/Padding/Margins overall:
          * Particularly `data-input-type` in a `group-subschema` are 0-gapped
        * `.settings-options` under the `textarea` the Label for the dropdown has a margin
          that's making things goofy.
        * Tooltip cursor should affect entire bar, not just the `i` icon
          * Also consider a new iconography like a diamond or something
  * Plugins
    * Add Author field
      * FreeForm? (i.e., `CodexHere <codexhere@outlook.com>` or `Discord: CodexHere#1111`)
    * Add Homepage field
      * Useful to link to github or an official page
  * PluginManager - Still consider refactoring to an injections process
    * event from AppBootstrapper indicating Renderer mode?
  * Bootstrapper
    * -- New train of thought for all this, Core Plugin injects what is now the Core Schema, and THAT has defaults set in it!
    * Change schema to be just an arraylist with columns:
      * Enabled
      * Plugin Name or URL
    * should take in a list of Built-In plugins
    * take in a list of required plugins (built-in, or remote)
      * if matches in the supplied list, needs to be enabled rather than added
    * Consider a way to just combine built-in and remote plugins
  * Consider moving Plugin Reloading (ie `pluginLoader`) to the Bootstrapper
    * Use Event for `PLUGINS_CHANGED` to reload
  * Consider adding `debug` and replace `console.log`
    * https://bundlephobia.com/package/debug@4.3.4
    * If we don't add it, remove `console.log`
  * Consider creating a new bg style, or various themes:
    * https://www.joshwcomeau.com/gradient-generator/
* Core Plugin needs to require Twitch-Chat
  * Need to make sure we have `Twitch - Chat` enabled
  * Maybe this is unnecessary if the process enforces enabling as mentioned in `Refactor > Bootstrapper`
* Work on Forms Validator Input types, make sure regexes are REALLY good!
* Add About/FAQ/ETC links on Settings Page
  * How to use it, etc.
  * or should it be a github wiki?
* Create some cool examples:
  * renderSettings
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