/**
 * @typedef {import('../Twitch - Chat/index.js').PluginSettings_TwitchChat} PluginSettings_TwitchChat
 * @typedef {Object} PluginSettings_Extra
 * @property {string} twitchEmoteSwap--clientId
 * @property {string} btnGetClientId
 * @typedef {PluginSettings_TwitchChat & PluginSettings_Extra} PluginSettings
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {Partial<ConcreteContext>} Context
 *
 * @typedef {import('../../../src/scripts/utils/Forms/types.js').FormSchemaGrouping} FormSchemaGrouping
 * @typedef {import('../../../src/scripts/utils/Forms/types.js').FormValidatorResults<PluginSettings>} FormValidatorResults
 * @typedef {import('../../../src/scripts/types/ContextProviders.js').ContextProviders} ContextProviders
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginMiddlewareMap<Context>} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/utils/Middleware.js').Next<Context>} Next
 */

// @ts-ignore
import { loadAssets, replaceEmotes, setTwitchCredentials } from 'https://esm.sh/tmi-emote-parse@2.0.0';

const BaseUrl = () => import.meta.url.split('/').slice(0, -1).join('/');

const API_BaseUrl = 'https://twitchtokengenerator.com/api';

/**
 * @implements {PluginInstance}
 */
export default class Plugin_Twitch_EmoteSwap {
  name = 'Twitch - Emote Swap';
  version = '1.0.0';
  ref = Symbol(this.name);
  priority = 20;

  /**
   * @type {ContextProviders | undefined}
   */
  #ctx;

  /**
   * @returns {true | FormValidatorResults}
   */
  isConfigured() {
    /** @type {PluginSettings} */
    const {
      'twitchEmoteSwap--clientId': clientId,
      refreshTokenBot,
      refreshTokenStreamer
    } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    if (!!clientId) {
      return true;
    }

    /** @type {FormValidatorResults} */
    let retMap = {};

    if (false === !!clientId) {
      retMap['twitchEmoteSwap--clientId'] = 'Please supply a ClientID';
    }

    if (false === !!clientId && false === !!refreshTokenBot && false === !!refreshTokenStreamer) {
      retMap['twitchEmoteSwap--clientId'] = 'To generate a ClientID, provide either a Streamer or Bot Refresh Token.';
    }

    return retMap;
  }

  constructor() {
    console.log(`[${this.name}] instantiated`);
  }

  /**
   * @param {ContextProviders} ctx
   */
  register = async ctx => {
    await ctx.settings.register(this, new URL(`${BaseUrl()}/settings.json`));
    ctx.bus.registerMiddleware(this, {
      'chat:twitch': [this.middleware]
    });

    this.#ctx = ctx;
  };

  /**
   * @param {() => void} forceSyncSettings
   */
  async renderSettings(forceSyncSettings) {
    this.forceSyncSettings = forceSyncSettings;

    // Update state of UI on changes
    // prettier-ignore
    globalThis
      .document
      .body
      .querySelector('form#settings')
      ?.addEventListener('change', this.#updateSettingsUI);

    this.#updateSettingsUI();
  }

  #updateSettingsUI = () => {
    const body = globalThis.document.body;

    /** @type {HTMLInputElement | null} */
    const button = /** @type {HTMLInputElement } */ body.querySelector('[name="btnGetClientId"]');

    if (!button) {
      return;
    }

    /** @type {PluginSettings} */
    const { refreshTokenBot, refreshTokenStreamer } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    button.disabled = !(!!refreshTokenBot || !!refreshTokenStreamer);
    // This can be called many times through `isConfigured` so we need to pre-emptively remove
    // the listener to avoid a memory leak
    button.removeEventListener('click', this.#onClickGetClientId);
    button.addEventListener('click', this.#onClickGetClientId);
  };

  /**
   * @param {Event} event
   */
  #onClickGetClientId = async event => {
    if (false === event.target instanceof HTMLButtonElement) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    event.target.disabled = true;

    /** @type {PluginSettings} */
    const { refreshTokenBot, refreshTokenStreamer } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    const container = event.target.closest('[data-input-type="grouparray"]');
    /** @type {NodeListOf<HTMLInputElement> | undefined} */
    const inputs = container?.querySelectorAll('.password-wrapper input');

    const refreshToken = refreshTokenStreamer ?? refreshTokenBot;

    if (inputs && inputs[0]) {
      const refreshResp = await fetch(`${API_BaseUrl}/refresh/${refreshToken}`);
      const refresh = await refreshResp.json();

      inputs[0].value = refresh.client_id;
    }

    this.forceSyncSettings?.();
  };

  /**
   * @param {Context} context
   * @param {Next} next
   */
  middleware = async (context, next) => {
    if (context.message && context.channel) {
      context.message = replaceEmotes(context.message, context.userState, context.channel);
    }

    await next();
  };

  renderApp() {
    console.log(`[${this.name}] [renderApp]`);

    /** @type {PluginSettings} */
    const {
      'twitchEmoteSwap--clientId': clientId,
      tokenStreamer,
      tokenBot,
      nameStreamer
    } = /** @type {ContextProviders} */ (this.#ctx).settings.get();

    const token = tokenStreamer ?? tokenBot;

    if (!clientId || !token) {
      return;
    }

    setTwitchCredentials(clientId, token);

    loadAssets('twitch');
    loadAssets(nameStreamer);
  }
}
