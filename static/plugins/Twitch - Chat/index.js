// @ts-ignore
import tmiJs from 'https://esm.sh/tmi.js@1.8.5';

/**
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginSettingsBase} PluginSettingsBase
 * @typedef {Object} PluginSettings_Extra
 * @property {string} nameStreamer
 * @property {string} tokenBot
 * @property {string} tokenStreamer
 * @property {string} refreshTokenBot
 * @property {string} refreshTokenStreamer
 * @typedef {PluginSettings_Extra & PluginSettingsBase} PluginSettings
 * @typedef {PluginSettings} PluginSettings_TwitchChat
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {Partial<ConcreteContext>} Context
 *
 * @typedef {import('../../../src/scripts/types/Events.js').RendererStartedHandlerOptions} RendererStartHandlerOptions
 @typedef {import('../../../src/scripts/utils/Forms/types.js').FormSchemaGrouping} FormSchemaGrouping
 * @typedef {import('../../../src/scripts/utils/Forms/types.js').FormValidatorResults<PluginSettings>} FormValidatorResults
 * @typedef {import('../../../src/scripts/types/ContextProviders.js').ContextProviders} ContextProviders
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginMiddlewareMap<Context>} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 */

const BaseUrl = () => import.meta.url.split('/').slice(0, -1).join('/');

const API_BaseUrl = 'https://twitchtokengenerator.com/api';
const API_TTL = 60 * 1000;
const API_TTY = 2 * 1000;

// prettier-ignore
const SCOPES = [
  'chat:read',
  'chat:edit'
]

/**
 * @implements {PluginInstance}
 */
export default class TwitchChat {
  name = 'Twitch - Chat';
  version = '1.0.0';
  author = 'CodexHere <codexhere@outlook.com>';
  homepage = 'https://overlay-chat.surge.sh';
  ref = Symbol(this.name);
  priority = 1;

  /** @type {Record<'bot'|'streamer', tmiJs.Client | undefined>} */
  clients = {
    bot: undefined,
    streamer: undefined
  };

  /**
   * @type {ContextProviders | undefined}
   */
  #ctx;

  get hasAuthedClientStreamer() {
    return !!this.clients.streamer && false === this.clients.streamer.getUsername().startsWith('justin');
  }

  get hasAuthedClientBot() {
    return !!this.clients.bot && false === this.clients.bot.getUsername().startsWith('justin');
  }

  constructor() {
    console.log(`[${this.name}] instantiated`);
  }

  /**
   * @returns {true | FormValidatorResults}
   */
  isConfigured() {
    const nameStreamer = /** @type {PluginSettings} */ (this.#ctx?.settings.get());
    const hasChannelName = !!nameStreamer;

    if (hasChannelName) {
      return true;
    }

    /** @type {FormValidatorResults} */
    let retMap = {};

    if (false === hasChannelName) {
      retMap['nameStreamer'] = 'Please supply a Channel Name';
    }

    return retMap;
  }

  /**
   * @param {ContextProviders} ctx
   */
  register = async ctx => {
    await ctx.settings.register(this, new URL(`${BaseUrl()}/settings.json`));
    ctx.bus.registerEvents(this, this.#getEvents());
  };

  unregister() {
    const body = globalThis.document.body;
    const authButtons = body.querySelectorAll('[name*="btnAuth"]');
    const refreshButtons = body.querySelectorAll('[name*="btnRefresh"]');

    authButtons.forEach((btn, idx) => {
      btn.removeEventListener('click', this.#onClickAuth);
      refreshButtons[idx].removeEventListener('click', this.#onClickRefresh);
    });

    body.querySelector('form#settings')?.removeEventListener('change', this.#updateSettingsUI);
  }

  /**
   * @returns {PluginEventMap}
   */
  #getEvents() {
    console.log(`[${this.name}] Registering Events`);

    return {
      recieves: {
        'AppBootstrapper::RendererStarted': this.#onRendererStart,
        'chat:twitch:sendMessage': this.#onBusSendMessage,
        'chat:twitch:hasAuth': this.#onBusHasAuth
      },
      sends: ['Plugin::SyncSettings', 'chat:twitch:onChat']
    };
  }

  /**
   * Handler for when Application starts the Renderer.
   *
   * @param {RendererStartHandlerOptions} param0
   */
  #onRendererStart = ({ renderMode, ctx }) => {
    this.#ctx = ctx;

    if ('app' === renderMode) {
      this.#renderApp();
    }

    if ('configure' === renderMode) {
      this.#renderConfiguration();
    }
  };

  async #renderApp() {
    try {
      await this.#initChatListen();
    } catch (err) {
      const errInst = /** @type {Error} */ (/** @type {unknown} */ err);
      const errors = [errInst];

      if (errInst.message.includes('Login authentication failed')) {
        errors.push(new Error('Try going to Settings, and refreshing your Auth Token!'));
      }

      this.#ctx?.display.showError(errors);
    }
  }

  async #renderConfiguration() {
    // Update state of UI on changes
    // prettier-ignore
    globalThis
      .document
      .body
      .querySelector('form#settings')
      ?.addEventListener('input', this.#updateSettingsUI);

    this.#updateSettingsUI();
  }

  #updateSettingsUI = () => {
    const body = globalThis.document.body;

    /** @type {NodeListOf<HTMLInputElement> | undefined} */
    const authButtons = body.querySelectorAll('[name*="btnAuth"]');
    /** @type {NodeListOf<HTMLInputElement> | undefined} */
    const refreshButtons = body.querySelectorAll('[name*="btnRefresh"]');

    if (0 === authButtons.length || 0 === refreshButtons.length) {
      return;
    }

    authButtons.forEach((btn, idx) => {
      btn.addEventListener('click', this.#onClickAuth);
      refreshButtons[idx].addEventListener('click', this.#onClickRefresh);

      const container = btn.closest('[data-input-type="grouparray"]');
      /** @type {NodeListOf<HTMLInputElement> | undefined} */
      const inputs = container?.querySelectorAll('.password-wrapper input');

      const hasBothTokens = !!(inputs && inputs[0] && inputs[0].value && inputs[1] && inputs[1].value);

      btn.disabled = hasBothTokens;
      refreshButtons[idx].disabled = !hasBothTokens;
    });
  };

  /**
   * @param {Event} event
   */
  #onClickAuth = async event => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const scopes = SCOPES.join('+');
    const createResp = await fetch(`${API_BaseUrl}/create/${btoa('Twitch Chat Plugin by CodexHere')}/${scopes}`);

    const create = await createResp.json();

    event.target.disabled = true;

    globalThis.window.open(create.message, '_new');

    try {
      const tokens = await this.#waitForAuth(create);

      this.#updateTokenInputs(tokens, event.target);
      this.#ctx?.bus.emit('Plugin::SyncSettings');
    } catch (err) {
      event.target.disabled = false;

      const errInst = /** @type {Error} */ (/** @type {unknown} */ err);
      this.#ctx?.display.showError(errInst);
    }
  };

  /**
   * @param {Event} event
   */
  #onClickRefresh = async event => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    event.target.disabled = true;

    const container = event.target.closest('[data-input-type="grouparray"]');
    /** @type {NodeListOf<HTMLInputElement> | undefined} */
    const inputs = container?.querySelectorAll('.password-wrapper input');

    if (inputs && inputs[1]) {
      const refreshToken = inputs[1].value;
      const refreshResp = await fetch(`${API_BaseUrl}/refresh/${refreshToken}`);
      const tokens = await refreshResp.json();

      this.#updateTokenInputs(tokens, event.target);
      this.#ctx?.bus.emit('Plugin::SyncSettings');
    } else {
      return false;
    }
  };

  /**
   * @param {*} tokens
   * @param {HTMLButtonElement} button
   */
  #updateTokenInputs = (tokens, button) => {
    const container = button.closest('[data-input-type="grouparray"]');
    /** @type {NodeListOf<HTMLInputElement> | undefined} */
    const inputs = container?.querySelectorAll('.password-wrapper input, input[type="hidden"]');

    if (inputs && inputs[0]) {
      inputs[0].value = tokens.token;
    }

    if (inputs && inputs[1]) {
      inputs[1].value = tokens.refresh;
    }

    if (inputs && inputs[2]) {
      inputs[2].value = tokens.client_id;
    }
  };

  /**
   * @param {*} create
   */
  async #waitForAuth(create) {
    const start = new Date().getTime();

    return new Promise((resolve, reject) => {
      const clear = () => {
        clearInterval(intervalId);
        intervalId = 0;
      };

      let intervalId = setInterval(async () => {
        const statusResp = await fetch(`${API_BaseUrl}/status/${create.id}`);
        const status = await statusResp.json();

        if (true === status.success) {
          clear();
          resolve(status);
        } else {
          // Never gonna execute
          if (4 === status.error) {
            clear();
            reject(new Error("Token already processed. This shouldn't happen!"));
          }
        }

        // Elapse timeout
        const elapsed = new Date().getTime() - start;
        if (elapsed > API_TTL) {
          clear();
          reject(new Error('Timed out waiting for Twitch Authorization'));
        }
      }, API_TTY);
    });
  }

  #generateTmiOptions() {
    /** @type {PluginSettings} */
    const { nameStreamer, tokenStreamer, tokenBot } = /** @type {ContextProviders} */ (this.#ctx).settings.get();
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

  async #initChatListen() {
    /** @type {PluginSettings} */
    const { nameStreamer } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    if (!nameStreamer) {
      return;
    }

    const tmiOpts = this.#generateTmiOptions();

    try {
      this.clients.streamer = new tmiJs.Client(tmiOpts.streamer);
      await this.clients.streamer.connect();
      this.clients.streamer.on('message', this.#handleMessage_Streamer);
    } catch (err) {
      delete this.clients['streamer'];
      throw new Error('Could not connect Streamer to chat: ' + err);
    }

    try {
      if (tmiOpts.bot) {
        this.clients.bot = new tmiJs.Client(tmiOpts.bot);
        await this.clients.bot.connect();
        this.clients.bot.on('message', this.#handleMessage_Bot);
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
  #handleMessage_Streamer = (channel, userstate, message, isSelf) => {
    /** @type {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} */
    const ctx = {
      userState: userstate,
      channel,
      isSelf,
      message,
      clientType: 'streamer'
    };

    console.log('Streamer Got: ', message);

    this.#ctx?.bus.emit('chat:twitch:onChat', ctx);
  };

  /**
   * @param {string} channel
   * @param {tmiJs['ChatUserstate']} userstate
   * @param {string} message
   * @param {boolean} isSelf
   */
  #handleMessage_Bot = (channel, userstate, message, isSelf) => {
    /** @type {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} */
    const ctx = {
      userState: userstate,
      channel,
      isSelf,
      message,
      clientType: 'bot'
    };

    console.log('Bot Got: ', message);

    this.#ctx?.bus.emit('chat:twitch:onChat', ctx);
  };

  /**
   * @param {string} message
   * @param {'bot' | 'streamer'} useClient
   */
  #onBusSendMessage = (message, useClient = 'bot') => {
    /** @type {PluginSettings} */
    const { nameStreamer } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    // Use the client specified, defaulting to `bot`
    // If `streamer` is set, try to use that, otherwise fallback to `bot` client if valid
    // lastly fallback to `null` for error handling
    const client =
      'bot' === useClient && this.hasAuthedClientBot ? this.clients.bot
      : this.hasAuthedClientStreamer ? this.clients.streamer
      : this.hasAuthedClientBot ? this.clients.bot
      : null;

    if (!client) {
      throw new Error('No Authenticated Twitch Client to message on');
    }

    client?.say(nameStreamer, message);
  };

  #onBusHasAuth = () => {
    return {
      streamer: this.hasAuthedClientStreamer,
      bot: this.hasAuthedClientBot
    };
  };
}
