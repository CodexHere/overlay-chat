# HangoutHere Overlay: Chat

## TODO

* A build will not load plugins correctly with the `import`, might need explicit interface defined for adhoc typing. Right now as it stands it tries to import live via ESM which won't work since the base class is compiled into the bundle.
* Support `multi-checkbox`/`multi-switch` in the same vain as multi-select... Should be a list of checkboxes
  * Also `radio`
* Build a dropdown to jump to a plugins' settings
  * Plugin will need more contextual data:
    * Name
    * Priority for load order. This could be dangerous depending on the author of the plugin, as it can mess up priority order for loading, and thus cause issues.
* Create `middleware()` functiona for Plugins
  * https://github.com/Digibear-io/middleware
  * `PluginManager` needs to sort Plugins in `Priority` order
* Rename to Default Plugin to Example with some cool examples
* Do we move core functionality to a `Core` plugin that is always loaded? This lets the framework be more agnostic?
* Figure out debouncing on Settings... There's some annoyance with UX and jumping to a required input
* Bootstrapper should load HTML Template file
* Inject all values as CSS variables?
  * Do we make this a `FormEntry` prop? ie, `injectCssVar`?
* CI/CD
  * https://vitejs.dev/guide/static-deploy
  ```yaml
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
  ```
* Ability to compress (`lz-string`) url params
  * `&compressed=true&data=<data_here>`
  * Will need to decompress in settings as well

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
* Sound Effects - Sound on Message
* Sound Effects - User Entrance
* Link Replacement
* Word replacement
* Emoji Replacments (7TV, BTTV)
  * Emoji Themes
* Authentication w/Twitch
* Administrative Actions? (needs auth)
* Chat Box (send as user, needs auth)
* Follower Stuff
	* Border/glow animations?
	* Confetti around follow message in chat?
* Top Chatter
	* Special Badge?
	* Some kind of color/etc treatment
