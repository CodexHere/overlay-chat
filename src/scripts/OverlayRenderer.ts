import Splitting from 'splitting';
import { loadAssets, replaceEmotes } from 'tmi-emote-parse';
import tmiJs from 'tmi.js';
import SettingsManager from './SettingsManager';
import { BootOptions } from './types';
import { Templating } from './utils/Templating';
import { GetColorForUsername } from './utils/misc';

type MessagePayload = {
  user: string;
  userColor: string;
  messageId: string;
  message: string;
};

export class OverlayRenderer {
  constructor(private bootOptions: BootOptions, private settingsMgr: SettingsManager) {}

  init() {
    this.initChatListen();
  }

  initChatListen() {
    const channelName = this.settingsMgr.settings['channelName'];

    if (!channelName) {
      return;
    }

    const client = new tmiJs.Client({
      channels: [channelName]
    });

    client.connect().catch(console.error);
    client.on('message', this.handleMessage);

    loadAssets('twitch');
    loadAssets(channelName);
  }

  private handleMessage = (channel: string, userstate: tmiJs.ChatUserstate, message: string, _self: boolean) => {
    if ('chat' !== userstate['message-type']) {
      return;
    }

    const transformedMessage = replaceEmotes(message, userstate, channel);

    this.renderMessage({
      user: userstate['display-name']!,
      userColor: userstate.color || GetColorForUsername(userstate['display-name']!),
      messageId: userstate.id!,
      message: transformedMessage
    });

    this.removeOutOfBoundsMessages();
  };

  renderMessage(data: MessagePayload) {
    Templating.RenderTemplate(
      this.bootOptions.elements!['container'],
      this.bootOptions.templates!['chat-message'],
      data
    );

    Splitting({ target: `[data-message-id="${data.messageId}"]` });
  }

  removeOutOfBoundsMessages() {
    const container = this.bootOptions.elements!['container'];

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
