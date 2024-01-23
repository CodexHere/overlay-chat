# HangoutHere Overlay: Chat

## TODO

* Create `middleware()` functions for Plugins
  * https://github.com/Digibear-io/middleware
  * Core app registers itself as first middleware to kick off pipeline
  * Needs a way to break out of middleware, ie ignoring a chatter shouldn't continue any processing
* Rename to Default Plugin to Example with some cool examples
* Do we move core functionality to a `Core` plugin that is always loaded? This lets the framework be more agnostic?
  * Include Authentication w/Twitch
  * Event:SendMessage (if auth'd properly) - Sends a simple message to chat
  * Event:HasAuth - returns bool if auth'd
* Figure out debouncing on Settings... There's some annoyance with UX and jumping to a required input
* Bootstrapper should load HTML Template file
* Inject all values as CSS variables?
  * Do we make this a `FormEntry` prop? ie, `injectCssVar`?
* New FormEntry type: array
  * Similar to a field group, but the children are repeated n-times
  * The user is given +/- buttons, and possibly re-ordering? 
    * https://github.com/lukasoppermann/html5sortable#examples
* Ability to compress (`lz-string`) url params
  * `&compressed=true&data=<data_here>`
  * Will need to decompress in settings as well
* Heavily Document everything
* Librarify:
  * Overlay Architecture
  * Form Utils
     * Options to auto convert to array per key
  * URI Serialize/Deserialize
     * Options to auto convert to array per key
* Build a dropdown to jump to a plugins' settings
  * Plugin will need more contextual data:
    * Name
    * Priority for load order. This could be dangerous depending on the author of the plugin, as it can mess up priority order for loading, and thus cause issues.
* Convert to use `hh-util`
  * `hh-util` needs proper publishing

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
  - `SettingsManager` initialized
    - Load Settings from URI
    - Load Core Settings Schema
  - `PluginManager` initialized
    - Load Plugin instances from `SettingsManager`, or fallback to Default Plugin
    - Inject Plugin stylesheets into `<head>` in DOM
  - Init Plugin Settings from all loaded Plugins
  - App Start
    - Determine if Settings are configured
      - If Configured, `init` the Overlay Renderer
      - If Unconfigured, `init` the Settings Renderer

## Plugins

### Ideas

* Chat Animations
  * https://www.minimamente.com/project/magic/
  * https://animate.style/
  * Reveal animation
    * Per Word vs Per Character
  * Remove animation
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
* Ad Detection
  * Sends Message
  * Needs Auth
* Top Chatter
  * Special Badge?
  * Some kind of color/etc treatment
* Follower Stuff
  * Border/glow animations?
  * Confetti around follow message in chat?
  * Send message welcoming viewer
* History Plugin:
  * Stores chats in localStorage to be retrieved on load, so chat isn't empty on first load
