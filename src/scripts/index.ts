import Handlebars from 'handlebars';
import Splitting from 'splitting';
import { loadAssets, replaceEmotes } from 'tmi-emote-parse';
import tmiJs from 'tmi.js';
import OverlaySettings from './settings';
import { GetColorForUsername, RenderTemplate } from './util';

type MessagePayload = {
  user: string;
  userColor: string;
  messageId: string;
  message: string;
};

export default class Overlay {
  #elemIdTemplateChat = 'template-chat-message';
  #elemIdChatContainer = 'container-chat';

  #templates: Record<string, HandlebarsTemplateDelegate<any>> = {};
  #elements: Record<string, HTMLElement> = {};
  #settings?: OverlaySettings;

  init() {
    const body = document.getElementsByTagName('body')[0];
    this.#elements['container'] = document.getElementById(this.#elemIdChatContainer) as HTMLElement;

    this.#prepTemplates();
    this.#settings = new OverlaySettings(body);
    this.#settings.init();

    if (this.#settings?.isConfigured) {
      this.#initChatListen();
    } else {
      this.#settings.showSettings();
    }
  }

  #initChatListen() {
    const channelName = this.#settings?.options['channelName'];

    if (!channelName) {
      return;
    }

    const client = new tmiJs.Client({
      channels: [channelName]
    });

    client.connect().catch(console.error);
    client.on('message', this.#handleMessage);

    loadAssets('twitch');
    loadAssets(channelName);
  }

  #prepTemplates() {
    const template = document.getElementById(this.#elemIdTemplateChat);
    this.#templates['chat-message'] = Handlebars.compile(template?.innerHTML, { noEscape: true });
  }

  #handleMessage = (channel: string, userstate: tmiJs.ChatUserstate, message: string, _self: boolean) => {
    if ('chat' !== userstate['message-type']) {
      return;
    }

    const transformedMessage = replaceEmotes(message, userstate, channel);

    this.#renderMessage({
      user: userstate['display-name']!,
      userColor: userstate.color || GetColorForUsername(userstate['display-name']!),
      messageId: userstate.id!,
      message: transformedMessage
    });

    this.#removeOutOfBoundsMessages();
  };

  #renderMessage(data: MessagePayload) {
    RenderTemplate(this.#elements['container'], this.#templates['chat-message'], data);
    Splitting({ target: `[data-message-id="${data.messageId}"]` });
  }

  #removeOutOfBoundsMessages() {
    const container = this.#elements['container'];

    if (!container) {
      return;
    }

    /** @type {Element[]} */
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
