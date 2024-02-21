import Splitting from 'splitting';
import tmiJs from 'tmi.js';
import { TemplatesBase } from './managers/TemplateManager.js';
import { BusManagerContext_Init, BusManagerEvents } from './types/Managers.js';
import { PluginMiddlewareMap } from './types/Middleware.js';
import {
  PluginEventRegistration,
  PluginInstance,
  PluginOptions,
  PluginRegistrationOptions,
  PluginSettingsBase
} from './types/Plugin.js';
import { IsInViewPort } from './utils/DOM.js';
import { FormValidatorResult, FormValidatorResults } from './utils/Forms.js';
import { MiddlewareLink } from './utils/Middleware.js';
import { RenderTemplate } from './utils/Templating.js';
import { BaseUrl } from './utils/URI.js';

export type AppSettings_Chat = PluginSettingsBase & {
  fontSize: number;
};

export type MiddewareContext_Chat = {
  channel: string;
  isBot: boolean;
  isSelf: boolean;
  message: string;
  userState: tmiJs.CommonUserstate;
};

type Context = Partial<MiddewareContext_Chat>;

type ElementMap = {
  container: HTMLElement;
};

type TemplateIDs = TemplatesBase | 'chat-message';

export default class Plugin_Core<PluginSettings extends AppSettings_Chat> implements PluginInstance<PluginSettings> {
  name = 'Core Plugin';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = -Number.MAX_SAFE_INTEGER;

  private elements: ElementMap = {} as ElementMap;

  constructor(public options: PluginOptions<PluginSettings>) {}

  registerPlugin = (): PluginRegistrationOptions => ({
    middlewares: this._getMiddleware(),
    events: this._getEvents(),
    templates: new URL(`${BaseUrl()}/templates/twitch-chat.html`)
  });

  isConfigured(): true | FormValidatorResults<PluginSettings> {
    const { customPlugins, plugins } = this.options.getSettings();
    const hasAnyPlugins = (!!customPlugins && 0 !== customPlugins.length) || (!!plugins && 0 !== plugins.length);

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

  private _getMiddleware = (): PluginMiddlewareMap => ({
    'chat:twitch': [this.middleware]
  });

  private _getEvents = (): PluginEventRegistration => ({
    receives: {
      'chat:twitch:onMessage': this._onMessage
    },
    sends: [BusManagerEvents.MIDDLEWARE_EXECUTE]
  });

  async renderApp(): Promise<void> {
    this.buildElementMap();
  }

  private buildElementMap() {
    const body = globalThis.document.body;
    this.elements['container'] = body.querySelector('#container')!;
  }

  private _onMessage = (ctx: MiddewareContext_Chat) => {
    if ('chat' !== ctx.userState['message-type']) {
      return;
    }

    const initCtx: BusManagerContext_Init<Context> = {
      chainName: 'chat:twitch',
      initialContext: ctx,
      initiatingPlugin: this
    };

    return this.options.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, initCtx);
  };

  middleware: MiddlewareLink<Context> = async (context, next) => {
    // Wait for Middleware chance to execute
    await next();

    // Only continue rendering if we're not the bot (ie, chat is rendered from streamer data)
    if (context.isBot) {
      return;
    }

    // Render Message
    this.renderMessage(context);
    // and detect out of bounds
    this.removeOutOfBoundsMessages();
  };

  renderMessage(context: Context) {
    const templates = this.options.getTemplates<TemplateIDs>();

    // prettier-ignore
    RenderTemplate(
      this.elements['container'],
      templates['chat-message'],
      context
    );

    Splitting({ target: `[data-message-id="${context.userState?.id}"]` });
  }

  removeOutOfBoundsMessages() {
    const container = this.elements['container'];

    if (!container) {
      return;
    }

    const children = [...container.querySelectorAll('.chat-message:not(.removing)')];

    const removeChild = (child: HTMLElement) => {
      console.log('Triggered removeChild');

      container.removeChild(child as Node);
    };

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

      if (false === isInBounds) {
        const child = children.shift();
        child?.classList.add('removing');

        const styleMap = child?.computedStyleMap();
        const animName = styleMap?.get('animation-name');

        // Animation Name is not set, instantly remove the child
        if ('none' === animName) {
          removeChild(child as HTMLElement);
        } else {
          // Otherwise, wait for the animation to end before removing
          child?.addEventListener('animationend', onAnimationEnd, true);
        }
      }
    }
  }
}
