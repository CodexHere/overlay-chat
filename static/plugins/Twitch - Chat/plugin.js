// @ts-ignore
import tmiJs from 'https://esm.sh/tmi.js@1.8.5';

/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} PluginSettingsBase
 * @typedef {Object} PluginSettings_Extra
 * @property {string} nameStreamer
 * @property {string} tokenBot
 * @property {string} tokenStreamer
 * @typedef {PluginSettings_Extra & PluginSettingsBase} PluginSettings
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {Partial<ConcreteContext>} Context
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryGrouping} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/types/Managers.js').SettingsValidatorResults<PluginSettings>} SettingsValidatorResults
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init<{}>} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Middleware.js').PluginMiddlewareMap} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginOptions<PluginSettings>} PluginInjectables
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginRegistrationOptions} PluginRegistrationOptions
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 *
 * @implements {PluginInstance}
 */
export default class TwitchChat {
  name = 'Twitch - Chat';
  version = '1.0.0';
  ref = Symbol(this.name);

  /** @type {Record<'bot'|'streamer', tmiJs.Client | undefined>} */
  clients = {
    bot: undefined,
    streamer: undefined
  };

  get hasAuthedClientStreamer() {
    return this.clients.streamer && false === this.clients.streamer.getUsername().startsWith('justin');
  }

  get hasClientBot() {
    return this.clients.bot && false === this.clients.bot.getUsername().startsWith('justin');
  }

  /**
   * @param {PluginInjectables} options
   */
  constructor(options) {
    this.options = options;
  }

  /**
   * @returns {true | SettingsValidatorResults}
   */
  isConfigured() {
    const { nameStreamer } = this.options.getSettings();

    const hasChannelName = !!nameStreamer;

    if (hasChannelName) {
      return true;
    }

    /** @type {SettingsValidatorResults} */
    let retMap = {};

    if (false === hasChannelName) {
      retMap['nameStreamer'] = 'Please supply a Channel Name';
    }

    return retMap;
  }

  /**
   * @returns {PluginRegistrationOptions}
   */
  registerPlugin = () => ({
    settings: this._getSettings(),
    events: this._getEvents(),
    stylesheet: new URL(`${import.meta.url.split('/').slice(0, -1).join('/')}/plugin.css`)
  });

  /**
   * @returns {FormEntryFieldGroup}
   */
  _getSettings = () => ({
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

  /**
   * @returns {PluginEventMap}
   */
  _getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      receives: {
        'chat:twitch:sendMessage': this._onBusSendMessage
      },
      sends: ['chat:twitch:onMessage']
    };
  }

  async renderApp() {
    await this.initChatListen();
  }

  generateTmiOptions() {
    const { nameStreamer, tokenStreamer, tokenBot } = this.options.getSettings();

    /** @type {tmiJs.Options | undefined} */
    let clientOptions_Bot;
    /** @type {tmiJs.Options} */
    let clientOptions_Streamer = {
      channels: [nameStreamer],
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
        channels: [nameStreamer],
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
      //   loadAssets('twitch');
      //   loadAssets(nameStreamer);
    } catch (err) {
      delete this.clients['streamer'];
      throw new Error('Could not connect Streamer to chat: ' + err);
    }

    try {
      if (tmiOpts.bot) {
        this.clients.bot = new tmiJs.Client(tmiOpts.bot);
        await this.clients.bot.connect();
        this.clients.bot.on('message', this.handleMessage_Bot);
      }
    } catch (err) {
      delete this.clients['bot'];
      throw new Error('Could not connect Bot to chat: ' + err);
    }
  }

  /**
   * @param {string} channel
   * @param {tmiJs['ChatUserstate']} userstate
   * @param {string} message
   * @param {boolean} isSelf
   */
  handleMessage_Streamer = (channel, userstate, message, isSelf) => {
    /** @type {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} */
    const ctx = {
      userState: userstate,
      channel,
      isSelf,
      message,
      isBot: false
    };

    console.log('Streamer Got: ', message);

    this.options.emitter.emit('chat:twitch:onMessage', ctx);
  };

  /**
   * @param {string} channel
   * @param {tmiJs['ChatUserstate']} userstate
   * @param {string} message
   * @param {boolean} isSelf
   */
  handleMessage_Bot = (channel, userstate, message, isSelf) => {
    /** @type {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} */
    const ctx = {
      userState: userstate,
      channel,
      isSelf,
      message,
      isBot: true
    };

    console.log('Bot Got: ', message);

    this.options.emitter.emit('chat:twitch:onMessage', ctx);
  };

  /**
   * @param {string} message
   * @param {'bot' | 'streamer'} useClient
   */
  _onBusSendMessage = (message, useClient = 'bot') => {
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

    client?.say(settings.nameStreamer, message);
  };
}
