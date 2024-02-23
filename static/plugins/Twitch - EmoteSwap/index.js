/**
 * @typedef {import('../Twitch - Chat/index.js').PluginSettings_TwitchChat} PluginSettings_TwitchChat
 * @typedef {Object} PluginSettings_Extra
 * @property {string} twitchEmoteSwap--clientId
 * @property {string} btnGetClientId
 * @typedef {PluginSettings_TwitchChat & PluginSettings_Extra} PluginSettings
 *
 * @typedef {import('../../../src/scripts/Plugin_Core.js').MiddewareContext_Chat} ConcreteContext
 * @typedef {Partial<ConcreteContext>} Context
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormEntryGrouping} FormEntryFieldGroup
 * @typedef {import('../../../src/scripts/utils/Forms.js').FormValidatorResults<PluginSettings>} SettingsValidatorResults
 * @typedef {import('../../../src/scripts/types/Managers.js').BusManagerContext_Init<{}>} BusManagerContext_Init
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginMiddlewareMap} PluginMiddlewareMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginEventRegistration} PluginEventMap
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginOptions<PluginSettings>} PluginInjectables
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginInstance<PluginSettings>} PluginInstance
 * @typedef {import('../../../src/scripts/types/Plugin.js').PluginRegistrationOptions} PluginRegistrationOptions
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
   * @returns {true | SettingsValidatorResults}
   */
  isConfigured() {
    const { 'twitchEmoteSwap--clientId': clientId, refreshTokenBot, refreshTokenStreamer } = this.options.getSettings();

    this.#updateSettingsUI();

    if (!!clientId) {
      return true;
    }

    /** @type {SettingsValidatorResults} */
    let retMap = {};

    if (false === !!clientId) {
      retMap['twitchEmoteSwap--clientId'] = 'Please supply a ClientID';
    }

    if (false === !!clientId && false === !!refreshTokenBot && false === !!refreshTokenStreamer) {
      retMap['twitchEmoteSwap--clientId'] = 'To generate a ClientID, provide either a Streamer or Bot Refresh Token.';
    }

    return retMap;
  }

  /**
   * @param {PluginInjectables} options
   */
  constructor(options) {
    this.options = options;

    console.log(`[${this.name}] instantiated`);
  }

  /**
   * @returns {PluginRegistrationOptions}
   */
  registerPlugin = () => ({
    settings: new URL(`${BaseUrl()}/settings.json`),
    middlewares: {
      'chat:twitch': [this.middleware]
    }
  });

  /**
   * @param {() => void} forceSyncSettings
   */
  async renderSettings(forceSyncSettings) {
    this.forceSyncSettings = forceSyncSettings;
  }

  #updateSettingsUI = () => {
    const body = globalThis.document.body;

    /** @type {HTMLInputElement | null} */
    const button = /** @type {HTMLInputElement } */ body.querySelector('[name="btnGetClientId"]');

    if (!button) {
      return;
    }

    const { refreshTokenBot, refreshTokenStreamer } = this.options.getSettings();

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

    const { refreshTokenBot, refreshTokenStreamer } = this.options.getSettings();

    const container = event.target.closest('[data-input-type="arraygroup"]');
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

    const { 'twitchEmoteSwap--clientId': clientId, tokenStreamer, tokenBot, nameStreamer } = this.options.getSettings();

    const token = tokenStreamer ?? tokenBot;

    if (!clientId || !token) {
      return;
    }

    setTwitchCredentials(clientId, token);

    loadAssets('twitch');
    loadAssets(nameStreamer);
  }
}
