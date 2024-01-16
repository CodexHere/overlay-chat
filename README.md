# HangoutHere Overlay: Chat

## TODO
* Inject all values as CSS variables
  * Do we make this a `FormEntry` prop? ie, `injectCssVar`?
* Do we always include default plugin?
* Splitting as a plugin?
* Do we want Plugins to load dependencies?

## Application Lifecycle

- BootStrap 
  - Responsible for initializing and maintining the lifecycle of the Application
  - Takes in the initial boot options:
      - Settings Manager
        - Define what it means for Settings to be "Configured"
          - Default Configuration is based on having a `channelName` defined.
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
* Sound Effects
* Link Replacement
* Emoji Replacments
* Authentication w/Twitch
* Administrative Actions? (woudl need auth)