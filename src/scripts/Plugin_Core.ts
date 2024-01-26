import Splitting from 'splitting';
import { loadAssets, replaceEmotes } from 'tmi-emote-parse';
import tmiJs from 'tmi.js';
import {
  BusManagerContext_Init,
  BusManagerEmitter,
  BusManagerEvents,
  ContextBase,
  OverlayPluginInstance,
  OverlaySettings,
  RenderOptions
} from './types.js';
import { Middleware } from './utils/Middleware.js';
import { RenderTemplate } from './utils/Templating.js';
import { GetColorForUsername } from './utils/misc.js';

export type OverlaySettings_Chat = OverlaySettings & {
  fontSize: number;
  nameBot?: string;
  nameStreamer?: string;
  tokenBot?: string;
  tokenStreamer?: string;
};

export type MiddewareContext_Chat = {
  channel: string;
  isBot: boolean;
  isSelf: boolean;
  message: string;
  messageId: string;
  user: string;
  userColor: string;
};

type Context = ContextBase & Partial<MiddewareContext_Chat>;
type ClientTypes = 'streamer' | 'bot';

export default class Plugin_Core implements OverlayPluginInstance {
  name = 'Core Plugin';
  ref = Symbol(this.name);

  private renderOptions: RenderOptions | undefined;

  private clients: Record<ClientTypes, tmiJs.Client | undefined> = {
    streamer: undefined,
    bot: undefined
  };

  constructor(
    public emitter: BusManagerEmitter,
    private getSettings: () => OverlaySettings_Chat
  ) {}

  async renderOverlay(renderOptions: RenderOptions): Promise<void> {
    this.renderOptions = renderOptions;
    await this.initChatListen();
  }

  private generateTmiOptions() {
    const { nameStreamer, tokenStreamer, nameBot, tokenBot } = this.getSettings();

    let clientOptions_Bot: tmiJs.Options | undefined;
    let clientOptions_Streamer: tmiJs.Options = {
      channels: [nameStreamer!]
    };

    if (nameStreamer && tokenStreamer) {
      console.log('Authenticating as Streamer');

      clientOptions_Streamer = {
        ...clientOptions_Streamer,

        identity: {
          username: nameStreamer,
          password: tokenStreamer
        }
      };
    }

    if (nameBot && tokenBot) {
      console.log('Authenticating as Bot');

      clientOptions_Bot = {
        channels: [nameStreamer!],

        identity: {
          username: nameStreamer,
          password: tokenStreamer
        }
      };
    }

    return {
      streamer: clientOptions_Streamer,
      bot: clientOptions_Bot
    };
  }

  async initChatListen() {
    const { nameStreamer } = this.getSettings();

    if (!nameStreamer) {
      return;
    }

    const tmiOpts = this.generateTmiOptions();

    try {
      this.clients.streamer = new tmiJs.Client(tmiOpts.streamer);
      await this.clients.streamer.connect();
      this.clients.streamer.on('message', this.handleMessage_Streamer);

      if (tmiOpts.bot) {
        this.clients.bot = new tmiJs.Client(tmiOpts.bot);
        await this.clients.streamer.connect();
        this.clients.streamer.on('message', this.handleMessage_Bot);
      }

      // TODO: Needs to move to icon swap plugin
      loadAssets('twitch');
      loadAssets(nameStreamer);
    } catch (err) {
      const myError = err as Error;
      throw new Error('Could not connect to chat: ' + myError.message);
    }
  }

  private buildInitialContext = (
    channel: string,
    userstate: tmiJs.ChatUserstate,
    message: string,
    isSelf: boolean,
    isBot = false
  ) => {
    if ('chat' !== userstate['message-type']) {
      return;
    }

    const ctx: Context = {
      runningErrors: [] as Error[],
      user: userstate['display-name']!,
      userColor: userstate.color || GetColorForUsername(userstate['display-name']!),
      messageId: userstate.id!,
      channel,
      isBot,
      isSelf,
      message
    };

    const initCtx: BusManagerContext_Init<Context> = {
      chainName: 'chat:twitch',
      initialContext: ctx,
      initiatingPlugin: this
    };

    return initCtx;
  };

  private handleMessage_Streamer = (
    channel: string,
    userstate: tmiJs.ChatUserstate,
    message: string,
    isSelf: boolean
  ) => {
    const ctx = this.buildInitialContext(channel, userstate, message, isSelf);

    if (ctx && ctx.initialContext) {
      ctx.initialContext.message = replaceEmotes(ctx.initialContext.message!, userstate, channel);
    }

    console.log('Streamer Got: ', message);

    this.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, ctx);
  };

  private handleMessage_Bot = (channel: string, userstate: tmiJs.ChatUserstate, message: string, isSelf: boolean) => {
    const ctx = this.buildInitialContext(channel, userstate, message, isSelf, true);

    console.log('Bot Got: ', message);

    this.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, ctx);
  };

  registerPluginMiddleware() {
    return new Map(
      Object.entries({
        'chat:twitch': [this.middleware]
      })
    );
  }

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
        this.renderOptions!.elements!['container'],
        this.renderOptions!.templates!['chat-message'],
    context);

    Splitting({ target: `[data-message-id="${context.messageId}"]` });
  }

  removeOutOfBoundsMessages() {
    const container = this.renderOptions!.elements!['container'];

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

      const parentNode = element.parentElement;
      const parentRect = parentNode!.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const isOutOfBounds = elementRect.top < parentRect.top;

      if (isOutOfBounds) {
        const child = children.shift();
        child?.classList.add('removing');
        child?.addEventListener('animationend', removeChild, true);
      }
    }
  }
}
