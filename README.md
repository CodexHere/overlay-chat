# HangoutHere Overlay: Chat

## TODO

******
* Documenting BusManager!!!
******

* Look at Plugins' `#updateSettingsUI` and do UX behaviors on Form input event!
* Heavily Document everything
  * Left `Forms` undocumented, because we're considering a rewrite.
* Core Plugin needs to require Twitch-Chat
* Refactor:
  * SettingsRenderer - Pull some stuff out into helper classes, particularly the Settings Options stuff. 
  * Forms - should use clases to generate output, consider design patterns (Builder, Visitor)
  * PluginOptions - rename to PluginServices
  * PluginContext - PluginRegistrar, and PluginServices
    * Needs rendererType: 'app' | 'settings'
  * PluginConstructor - needs to take in PluginContext
  * Bootstrapper
    * should take in a list of Built-In plugins
    * take in a list of required plugins (built-in, or remote)
  * Consider adding `debug` and replace `console.log`
    * https://bundlephobia.com/package/debug@4.3.4
    * If we don't add it, remove `console.log`
* Add About/FAQ/ETC links on Settings Page
  * How to use it, etc.
* Create some cool examples:
  * renderSettings, listen to click of button, show error
    * This should replace the timeout errors
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
* Enhance Range UX
  * Should be it's own handler that's not debounced so it updates faster
  * Value should be a number input
    * If value changed via input, Range should be set
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
* Convert to use `hh-util`
  * `hh-util` needs proper publishing
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