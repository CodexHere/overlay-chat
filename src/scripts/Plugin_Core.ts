/**
 * Core Plugin for this Application
 *
 * @module
 */

import Splitting from 'splitting';
import tmiJs from 'tmi.js';
import { TemplateIDsBase } from './managers/TemplateManager.js';
import { BusManagerContext_Init, BusManagerEvents } from './types/Managers.js';
import {
  PluginEventRegistration,
  PluginInstance,
  PluginMiddlewareMap,
  PluginOptions,
  PluginRegistration,
  PluginSettingsBase
} from './types/Plugin.js';
import { IsInViewPort } from './utils/DOM.js';
import { FormValidatorResult, FormValidatorResults } from './utils/Forms.js';
import { MiddlewareLink } from './utils/Middleware.js';
import { RenderTemplate } from './utils/Templating.js';
import { BaseUrl } from './utils/URI.js';

/**
 * Settings that can be applied to the entire Application across all {@link types/Plugin.PluginInstances | `PluginInstances`} and {@link types/Renderers.RendererInstance | `RendererInstance`}s.
 */
export type AppSettings_Chat = PluginSettingsBase & {
  /** General Font Size for the Application */
  fontSize: number;
};

/**
 * Context definition for all {@link MiddlewareLink | `MiddlewareLink`}s associated with the `twitch:chat` {@link utils/Middleware.MiddlewareChain | `MiddlewareChain`}.
 *
 * This is provided by the Event Handler for {@link https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#chat | TMIjs::chat()}.
 */
export type MiddewareContext_Chat = {
  /** Twitch Channel Chat was recieved. */
  channel: string;
  /** Is the Sender this Chat Client? */
  isSelf: boolean;
  /** The Message sent in the Chat. */
  message: string;
  /** Userstate from {@link tmiJs.CommonUserstate | `TMIjs`}. */
  userState: tmiJs.CommonUserstate;
  /** The type of the Client Handling the Chat Event */
  clientType: 'bot' | 'streamer';
};

/**
 * Our actual Context is just a fully optional object to satisfy our types
 */
type Context = Partial<MiddewareContext_Chat>;

/**
 * Our Element mapping that the Plugin needs to know about
 */
type ElementMap = {
  container: HTMLElement;
};

/** Allowable TemplateIDs for accessing the Templates service */
type TemplateIDs = TemplateIDsBase | 'chat-message';

/**
 * Core Plugin for this Application.
 *
 * Registers the initial `twitch:chat` {@link utils/Middleware.MiddlewareChain | `MiddlewareChain`} (because as the built-in core Plugin,
 * it's loaded first, always), and Listens for the `Twitch - Chat` Plugin to fire the Chat Event.
 */
export default class Plugin_Core<PluginSettings extends AppSettings_Chat> implements PluginInstance<PluginSettings> {
  name = 'Core Plugin';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = -Number.MAX_SAFE_INTEGER;

  /** Elements that this Plugin needs to know about. */
  private elements: ElementMap = {} as ElementMap;

  constructor(public options: PluginOptions<PluginSettings>) {}

  /**
   * Register this Plugin with the System.
   */
  registerPlugin = (): PluginRegistration => ({
    middlewares: this._getMiddleware(),
    events: this._getEvents(),
    templates: new URL(`${BaseUrl()}/templates/twitch-chat.html`)
  });

  /**
   * Evaluate the current settings for whether the Plugin is "Configured" or not.
   */
  isConfigured(): true | FormValidatorResults<PluginSettings> {
    const { customPlugins, plugins } = this.options.getSettings();
    const hasAnyPlugins = (!!customPlugins && 0 !== customPlugins.length) || (!!plugins && 0 !== plugins.length);

    // TODO: Need to make sure we have `Twitch - Chat` enabled

    if (hasAnyPlugins) {
      return true;
    }

    let retMap: FormValidatorResult<PluginSettings> = {};

    if (false === hasAnyPlugins) {
      retMap['plugins'] = 'Needs at least one Built-In or Custom Plugin';
      retMap['customPlugins'] = 'Needs at least one Built-In or Custom Plugin';
    }

    return retMap;
  }

  /**
   * Build `PluginMiddlewareMap` for this Plugin.
   */
  private _getMiddleware = (): PluginMiddlewareMap => ({
    'chat:twitch': [this.middleware_onMessage]
  });

  /**
   * Build `PluginEventRegistration` for this Plugin.
   */
  private _getEvents = (): PluginEventRegistration => ({
    recieves: {
      'chat:twitch:onChat': this._onMessage
    },
    sends: [BusManagerEvents.MIDDLEWARE_EXECUTE]
  });

  /**
   * Hook into App runtime
   */
  async renderApp(): Promise<void> {
    this.buildElementMap();
  }

  /**
   * Build Local Element Mapping this Plugin needs to know about.
   */
  private buildElementMap() {
    const body = globalThis.document.body;
    this.elements['container'] = body.querySelector('#container')!;
  }

  /**
   * Event Handler for `chat:twitch:onChat`.
   *
   * Executes `chat:twitch` {@link utils/Middleware.MiddlewareChain | `MiddlewareChain`}.
   *
   * @param context - Contextual ({@link MiddewareContext_Chat | `MiddewareContext_Chat`}) State passed from Link to Link.
   */
  private _onMessage = (context: MiddewareContext_Chat) => {
    if ('chat' !== context.userState['message-type']) {
      return;
    }

    // Construct the *initiating* Context object
    const initCtx: BusManagerContext_Init<Context> = {
      chainName: 'chat:twitch',
      initialContext: context,
      initiatingPlugin: this
    };

    return this.options.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, initCtx);
  };

  /**
   * Middleware Kickoff for `chat:twitch`.
   *
   * Allows the entire Chain finish Executing, doing whatever it needs to the `context`,
   * renders the Message to DOM, then triggers removal of out of bound messages.
   *
   * @param context - Contextual ({@link MiddewareContext_Chat | `MiddewareContext_Chat`}) State passed from Link to Link.
   * @param next - Next Link Handler
   */
  middleware_onMessage: MiddlewareLink<Context> = async (context, next) => {
    // Wait for Middleware chance to execute
    await next();

    // Only continue rendering if we're not the bot client (ie, chat is rendered from streamer data)
    if ('bot' === context.clientType) {
      return;
    }

    // Render Message
    this.renderMessage(context);
    // and detect out of bounds
    this.removeOutOfBoundsMessages();
  };

  /**
   * Render the fully processed `context` data.
   *
   * @param context - Contextual ({@link MiddewareContext_Chat | `MiddewareContext_Chat`}) State passed from Link to Link.
   */
  renderMessage(context: Context) {
    const templates = this.options.getTemplates<TemplateIDs>();

    // prettier-ignore
    RenderTemplate(
      this.elements['container'],
      templates['chat-message'],
      context
    );

    // Utilize `splitting` to modify DOM in a helpful way for animations/etc.
    Splitting({ target: `[data-message-id="${context.userState?.id}"]` });
  }

  /**
   * Evaluate whether any Message Elements are out of bounds, and remove them if the are out of bounds.
   *
   * > An Element that doesn't have any CSS `animation-name` applied will be instantly removed.
   */
  removeOutOfBoundsMessages() {
    const container = this.elements['container'];

    if (!container) {
      return;
    }

    // Only consider Chat Message Elements that aren't already marked as `removing`.
    const children = [...container.querySelectorAll('.chat-message:not(.removing)')];
    // Remove the Child from the Container.
    const removeChild = (child: HTMLElement) => container.removeChild(child as Node);
    // When the `removing` animation completes, remove the child and Event Listener.
    const onAnimationEnd = (event: Event) => {
      removeChild(event.currentTarget as HTMLElement);
      event.currentTarget!.removeEventListener('animationend', onAnimationEnd, true);
    };

    for (let childIdx = 0; childIdx < children.length; childIdx++) {
      const element = children[childIdx];

      if (!element || !element.parentNode) {
        continue;
      }

      const parentNode = element.parentElement as HTMLElement;
      const isInBounds = IsInViewPort(element as HTMLElement, parentNode);

      // In Bounds, nothing to do!
      if (true === isInBounds) {
        return;
      }

      // Add our `removing` class to allow CSS to do it's job with animations/transitions/etc.
      element.classList.add('removing');

      // Detect if an `animation-name` is applied to the Computed StyleMap
      const styleMap = element.computedStyleMap();
      const animName = styleMap?.get('animation-name');

      // Animation Name is not set, instantly remove the child!
      if ('none' === animName) {
        removeChild(element as HTMLElement);
      } else {
        // Otherwise, wait for the animation to end before removing.
        element.addEventListener('animationend', onAnimationEnd, true);
      }
    }
  }
}
