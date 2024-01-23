# HangoutHere Overlay: Chat

## TODO

* Create `middleware()` functions for Plugins
  * https://github.com/Digibear-io/middleware
  * Core app registers itself as first middleware to kick off pipeline
  * Needs a way to break out of middleware, ie ignoring a chatter shouldn't continue any processing
	* Throw a custom error type, and/or shape
  * Needs not to use just a central pipeline, but plugins can register for certain names as they are "binded"...
	* They give names of "chains" they want to belong to
	* The plugin-manager (by way of BusManager) will register the plugin to said chains
		* If the chain already exists, add to pipeline
		* If the chain doesn't exist, create and map pipeline to the first plugin to create it
			* Might use symbol?
		* When executing a chain (event needs to update, needs iface for chainName & context), only executes if matches the first plugin creating the chain
* Form Groups: Add Description to interface, and create a custom div for it
	* SHould we also include simple Text sections? This could allow injectable html, which could be dangerous!
* Rename to Default Plugin to Example with some cool examples
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
* Do we move core functionality to a `Core` plugin that is always loaded? This lets the framework be more agnostic?
* ALL Plugins need chance to implement `isConfigured`
	* If not, there's no way to know if the overlay is ACTUALLY configured
	* No longer should be an injection to Bootstrapper since it's now plugin-based, and will be part of Core Plugin
* Move existing Twitch Chat stuff over to it's own Chat: Core plugin
  * Include Authentication w/Twitch
  * Event:SendMessage (if auth'd properly) - Sends a simple message to chat
  * Event:HasAuth - returns bool if auth'd
* Figure out debouncing on Settings... There's some annoyance with UX and jumping to a required input
* Bootstrapper should load HTML Template file
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
* Handle error responses from `SettingsValidator`
  * This will show errors and possibly modify the form validity if necessary
* Build a dropdown to jump to a plugins' settings
  * Plugin will need more contextual data:
    * Name
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
      - If Configured, `init` the Overlay Renderer
      - If Unconfigured, `init` the Settings Renderer

## Plugins

### Ideas

* Chat Core
* EventSub Core
* OBS WS Core
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



### Tree Code

```js
function TreeNode(value) {
  this.value = value;
  this.left = null;
  this.right = null;
}

function constructBinaryTree(sortedArray, start, end) {
  if (start > end) {
    return null;
  }

  const middle = Math.floor((start + end) / 2);
  const node = new TreeNode(sortedArray[middle]);

  node.left = constructBinaryTree(sortedArray, start, middle - 1);
  node.right = constructBinaryTree(sortedArray, middle + 1, end);

  return node;
}

function findNode(root, value) {
  if (root === null || root.value === value) {
    return root;
  }

  // Recursively search in the left subtree
  const leftResult = findNode(root.left, value);
  if (leftResult !== null) {
    return leftResult;
  }

  // Recursively search in the right subtree
  const rightResult = findNode(root.right, value);
  if (rightResult !== null) {
    return rightResult;
  }

  return null; // Node not found
}

// Example usage
const array = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
const sortedArray = array.sort();

const binaryTree = constructBinaryTree(sortedArray, 0, sortedArray.length - 1);
console.log(binaryTree);

const nodeToFind = 'banana';
const foundNode = findNode(binaryTree, nodeToFind);

if (foundNode !== null) {
  console.log(`Node '${nodeToFind}' found in the binary tree.`);
} else {
  console.log(`Node '${nodeToFind}' not found in the binary tree.`);
}

```

