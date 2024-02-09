# HangoutHere Overlay: Chat

## TODO

* Move existing Twitch Chat stuff over to it's own Chat: Core plugin
  * Include Authentication w/Twitch
    * Look more into: https://twitchtokengenerator.com/
  * Needs refresh capabilities
  * Event:SendMessage (if auth'd properly) - Sends a simple message to chat
  * Event:HasAuth - ?? returns bool if auth'd
* Move/Create other template
  * error dialogue
* Consider allowing plugins to register a template to load up front
* Find and Fix all `TODO` and `FIXME` comments in entire source!
  * Do not leave any! Finish ALL of them at once!
  * Add missing HTMLInput Elements:
    * File
    * DateTime/Calendar
    * https://www.w3schools.com/html/html_form_input_types.asp
* Heavily Document everything
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
* Librarify:
  * https://vitejs.dev/guide/build#library-mode
  * Overlay Architecture
  * Form Utils
     * Options to auto convert to array per key
  * URI Serialize/Deserialize
     * Options to auto convert to array per key
* Build a dropdown to jump to a plugins' settings
  * Plugin will need more contextual data:
    * Name
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
* Event Sub Response:
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
* Ignore Chatter
* Sound Effects - Sound on Message
* Sound Effects - User Entrance
* Link Replacement
* Word replacement
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
