import Splitting from 'splitting';
import tmiJs from 'tmi.js';
import {
  BusManagerContext_Init,
  BusManagerEvents,
  SettingsValidatorResult,
  SettingsValidatorResults
} from './types/Managers.js';
import { PluginMiddlewareMap } from './types/Middleware.js';
import {
  PluginEventRegistration,
  PluginInstance,
  PluginOptions,
  PluginRegistrationOptions,
  PluginSettingsBase
} from './types/Plugin.js';
import { Middleware } from './utils/Middleware.js';
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

  isConfigured(): true | SettingsValidatorResults<PluginSettings> {
    const { customPlugins, plugins } = this.options.getSettings();
    const hasAnyPlugins = (!!customPlugins && 0 !== customPlugins.length) || (!!plugins && 0 !== plugins.length);

    if (hasAnyPlugins) {
      return true;
    }

    let retMap: SettingsValidatorResult<PluginSettings> = {};

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

  middleware: Middleware<Context> = async (context, next) => {
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
    // prettier-ignore
    RenderTemplate(
      this.elements['container'],
      this.options.getTemplates()['chat-message'],
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

    for (let childIdx = 0; childIdx < children.length; childIdx++) {
      const element = children[childIdx];

      if (!element || !element.parentNode) {
        continue;
      }

      const removeChild = (event: Event) => {
        container.removeChild(event.currentTarget as Node);
        event.currentTarget!.removeEventListener('animationend', removeChild, true);
      };

      const parentNode = element.parentElement as HTMLElement;
      const parentRect = parentNode.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const isOutOfBounds = elementRect.top < parentRect.top;

      if (isOutOfBounds) {
        const child = children.shift();
        child?.classList.add('removing');
        // TODO: see how this works when there isn't an animation assigned/triggered
        child?.addEventListener('animationend', removeChild, true);
      }
    }
  }
}
