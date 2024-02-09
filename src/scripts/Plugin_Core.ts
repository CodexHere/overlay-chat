import Splitting from 'splitting';
import { loadAssets, replaceEmotes } from 'tmi-emote-parse';
import tmiJs from 'tmi.js';
import {
  BusManagerContext_Init,
  BusManagerEvents,
  SettingsValidatorResult,
  SettingsValidatorResults
} from './types/Managers.js';
import { ContextBase, PluginMiddlewareMap } from './types/Middleware.js';
import {
  PluginEventRegistration,
  PluginInstance,
  PluginOptions,
  PluginRegistrationOptions,
  PluginSettingsBase
} from './types/Plugin.js';
import { FormEntryGrouping } from './utils/Forms.js';
import { Middleware } from './utils/Middleware.js';
import { RenderTemplate } from './utils/Templating.js';
import { GetColorForUsername } from './utils/misc.js';

export type AppSettings_Chat = PluginSettingsBase & {
  fontSize: number;
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

type ElementMap = {
  container: HTMLElement;
};

export default class Plugin_Core<PluginSettings extends AppSettings_Chat> implements PluginInstance<PluginSettings> {
  name = 'Core Plugin';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = -Number.MAX_SAFE_INTEGER;

  private elements: ElementMap = {} as ElementMap;

  private clients: Record<ClientTypes, tmiJs.Client | undefined> = {
    streamer: undefined,
    bot: undefined
  };

  get hasAuthedClientStreamer() {
    return this.clients.streamer && false === this.clients.streamer.getUsername().startsWith('justin');
  }

  get hasClientBot() {
    return this.clients.bot && false === this.clients.bot.getUsername().startsWith('justin');
  }

  constructor(public options: PluginOptions<PluginSettings>) {}

  registerPlugin = (): PluginRegistrationOptions => ({
    middlewares: this._getMiddleware(),
    events: this._getEvents(),
    settings: this._getSettings()
  });

  isConfigured(): true | SettingsValidatorResults<PluginSettings> {
    const { customPlugins, plugins, nameStreamer } = this.options.getSettings();
    const hasAnyPlugins = (!!customPlugins && 0 !== customPlugins.length) || (!!plugins && 0 !== plugins.length);

    const hasChannelName = !!nameStreamer;

    if (hasChannelName && hasAnyPlugins) {
      return true;
    }

    let retMap: SettingsValidatorResult<PluginSettings> = {};

    if (false === hasChannelName) {
      retMap['nameStreamer'] = 'Please supply a Channel Name';
    }

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
      'chat:twitch--send': this._onBusSendMessage
    },
    sends: [BusManagerEvents.MIDDLEWARE_EXECUTE]
  });

  private _getSettings = (): FormEntryGrouping => ({
    name: 'channelSettings',
    label: 'Channel Settings',
    inputType: 'fieldgroup',
    description:
      'Enter your channel settings for Chat. If you do not supply a Token (<a href="https://twitchtokengenerator.com/quick/jC2M9JIPpc" target="_new">Chat Only</a> | <a href="https://twitchtokengenerator.com/quick/w4cpCN4PAV" target="_new">Everything</a>) for the Streamer or Bot User <i>each</i>, then the connection will be Anonymous and you cannot send messages.',
    values: [
      {
        name: 'nameStreamer',
        label: 'Channel Name (Streamer)',
        inputType: 'text',
        isRequired: true,
        tooltip: 'This is the channel you want to listen/send for Twitch Chat!'
      },
      {
        name: 'tokenStreamer',
        label: 'Chat Token (Streamer)',
        inputType: 'password'
      },
      {
        name: 'tokenBot',
        label: 'Chat Token (Bot)',
        inputType: 'password'
      }
    ]
  });

  async renderApp(): Promise<void> {
    this.buildElementMap();
    await this.initChatListen();
  }

  private buildElementMap() {
    const root = this.options.renderOptions.rootContainer;

    this.elements['container'] = root.querySelector('#container')!;
  }

  private generateTmiOptions() {
    const { nameStreamer, tokenStreamer, tokenBot } = this.options.getSettings();

    let clientOptions_Bot: tmiJs.Options | undefined;
    let clientOptions_Streamer: tmiJs.Options = {
      channels: [nameStreamer!],
      options: {
        skipUpdatingEmotesets: true
      }
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

    if (tokenBot) {
      console.log('Authenticating as Bot');

      clientOptions_Bot = {
        channels: [nameStreamer!],
        options: {
          skipUpdatingEmotesets: true
        },
        identity: {
          username: nameStreamer,
          password: tokenBot
        }
      };
    }

    return {
      streamer: clientOptions_Streamer,
      bot: clientOptions_Bot
    };
  }

  async initChatListen() {
    const { nameStreamer } = this.options.getSettings();

    if (!nameStreamer) {
      return;
    }

    const tmiOpts = this.generateTmiOptions();

    try {
      this.clients.streamer = new tmiJs.Client(tmiOpts.streamer);
      await this.clients.streamer.connect();
      this.clients.streamer.on('message', this.handleMessage_Streamer);
      // TODO: Needs to move to icon swap plugin
      loadAssets('twitch');
      loadAssets(nameStreamer);
    } catch (err) {
      const myError = err as Error;
      delete this.clients['streamer'];
      throw new Error('Could not connect Streamer to chat: ' + myError);
    }

    try {
      if (tmiOpts.bot) {
        this.clients.bot = new tmiJs.Client(tmiOpts.bot);
        await this.clients.bot.connect();
        this.clients.bot.on('message', this.handleMessage_Bot);
      }
    } catch (err) {
      const myError = err as Error;
      delete this.clients['bot'];
      throw new Error('Could not connect Bot to chat: ' + myError);
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

    // execute `chat:twitch`
    this.options.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, ctx);
  };

  private handleMessage_Bot = (channel: string, userstate: tmiJs.ChatUserstate, message: string, isSelf: boolean) => {
    const ctx = this.buildInitialContext(channel, userstate, message, isSelf, true);

    console.log('Bot Got: ', message);

    this.options.emitter.emit(BusManagerEvents.MIDDLEWARE_EXECUTE, ctx);
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
      this.options.renderOptions.templates['chat-message'],
      context
    );

    Splitting({ target: `[data-message-id="${context.messageId}"]` });
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

  _onBusSendMessage = (message: string, useClient: 'bot' | 'streamer' = 'bot') => {
    const settings = this.options.getSettings();
    // Use the client specified, defaulting to `bot`
    // If `streamer` is set, try to use that, otherwise fallback to `bot` client if valid
    // lastly fallback to `null` for error handling
    const client =
      'bot' === useClient && this.hasClientBot ? this.clients.bot
      : this.hasAuthedClientStreamer ? this.clients.streamer
      : this.hasClientBot ? this.clients.bot
      : null;

    if (!client) {
      throw new Error('No Authenticated Twitch Client to message on');
    }

    client?.say(settings.nameStreamer!, message);
  };
}
