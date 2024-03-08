/**
 * Core Plugin for this Application
 *
 * @module
 */

import Splitting from 'splitting';
import tmiJs from 'tmi.js';
import { ContextProviders } from './types/ContextProviders.js';
import { CoreEvents, RendererStartedHandlerOptions } from './types/Events.js';
import { BusManagerContext_Init } from './types/Managers.js';
import { PluginEventRegistration, PluginInstance, PluginMiddlewareMap, PluginSettingsBase } from './types/Plugin.js';
import { IsInViewPort } from './utils/DOM.js';
import { FormValidatorResults } from './utils/Forms/types.js';
import { MiddlewareLink } from './utils/Middleware.js';
import { RenderTemplate } from './utils/Templating.js';
import { BaseUrl } from './utils/URI.js';

/**
 * Settings that can be applied to the entire Application across all {@link types/Plugin.PluginInstances | `PluginInstances`} and {@link types/Renderers.RendererInstance | `RendererInstance`}s.
 */
type AppSettings_Chat = PluginSettingsBase & {
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
  /** Userstate from {@link https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0.1.450/types/tmi.js/index.d.ts#L135 | `TMIjs`}. */
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
type TemplateIDs = 'chat-message';

/**
 * Core Plugin for this Application.
 *
 * Registers the initial `twitch:chat` {@link utils/Middleware.MiddlewareChain | `MiddlewareChain`} (because as the built-in core Plugin,
 * it's loaded first, always), and Listens for the `Twitch - Chat` Plugin to fire the Chat Event.
 */
export default class Plugin_Core<PluginSettings extends AppSettings_Chat> implements PluginInstance<PluginSettings> {
  author?: string | undefined;
  homepage?: string | undefined;

  name = 'Core Plugin';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = -Number.MAX_SAFE_INTEGER;

  /** Elements that this Plugin needs to know about. */
  private elements: ElementMap = {} as ElementMap;

  /** Context Providers stored for adhoc calls. */
  private ctx?: ContextProviders;

  /**
   * Register this Plugin with the Application.
   */
  register = async (ctx: ContextProviders): Promise<void> => {
    ctx.bus.registerMiddleware(this, this.getMiddleware());
    ctx.bus.registerEvents(this, this.getEvents());
    await ctx.template.register(this, new URL(`${BaseUrl()}/templates/twitch-chat.html`));

    // ctx.settings.overrideSettingSchema<PluginSettings>('fontSize', {
    //   inputType: 'number',
    //   defaultValue: 69,
    //   isReadOnly: true,
    //   isDisabled: true
    // });

    // ctx.settings.overrideSettingSchema('plugins', {
    //   inputType: 'switch-multiple',
    //   values: ['Test 1', 'Test 2']
    // });

    this.ctx = ctx;
  };

  /**
   * Evaluate the current Settings for whether the Plugin is "Configured" or not.
   */
  isConfigured(): true | FormValidatorResults<PluginSettings> {
    const { customPlugins, plugins } = this.ctx!.settings.get();
    const hasAnyPlugins = (!!customPlugins && 0 !== customPlugins.length) || (!!plugins && 0 !== plugins.length);

    // TODO: Need to make sure we have `Twitch - Chat` enabled

    if (hasAnyPlugins) {
      return true;
    }

    let retMap: FormValidatorResults<PluginSettings> = {};

    if (false === hasAnyPlugins) {
      retMap['plugins'] = 'Needs at least one Built-In or Custom Plugin';
      retMap['customPlugins'] = 'Needs at least one Built-In or Custom Plugin';
    }

    return retMap;
  }

  /**
   * Build `PluginMiddlewareMap` for this Plugin.
   */
  private getMiddleware = (): PluginMiddlewareMap => ({
    'chat:twitch': [this.middleware_onMessage]
  });

  /**
   * Build `PluginEventRegistration` for this Plugin.
   */
  private getEvents = (): PluginEventRegistration => ({
    recieves: {
      [CoreEvents.RendererStarted]: this.onRendererStart,
      'chat:twitch:onChat': this.onMessage
    },
    sends: [CoreEvents.MiddlewareExecute]
  });

  /**
   * Handler for when Application starts the Renderer.
   *
   * @param options - Broadcasted Start options when a {@link RendererInstance | `RendererInstance`} has been selected and presented to the User.
   */
  private onRendererStart = (options: RendererStartedHandlerOptions) => {
    const { renderMode, ctx } = options;
    this.ctx = ctx;

    if ('app' === renderMode) {
      this.renderApp();
    }

    if ('configure' === renderMode) {
      // Currently no Config Rendering!
      // this.renderConfiguration();
    }
  };

  /**
   * Hook into Application runtime
   */
  private async renderApp(): Promise<void> {
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
  private onMessage = (context: MiddewareContext_Chat) => {
    if ('chat' !== context.userState['message-type']) {
      return;
    }

    // Construct the *initiating* Context object
    const initCtx: BusManagerContext_Init<Context> = {
      chainName: 'chat:twitch',
      initialContext: context,
      initiatingPlugin: this
    };

    return this.ctx!.bus.emit(CoreEvents.MiddlewareExecute, initCtx);
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
  private middleware_onMessage: MiddlewareLink<Context> = async (context, next) => {
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
  private renderMessage(context: Context) {
    const template = this.ctx!.template.getId<TemplateIDs>('chat-message');

    // prettier-ignore
    RenderTemplate(
      this.elements['container'],
      template,
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
  private removeOutOfBoundsMessages() {
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
