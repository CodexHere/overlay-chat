import Splitting from 'splitting';
import { loadAssets, replaceEmotes } from 'tmi-emote-parse';
import tmiJs from 'tmi.js';
import { OverlaySettings, RendererInstance, RendererInstanceOptions } from '../types.js';
import { RenderTemplate } from '../utils/Templating.js';
import { GetColorForUsername } from '../utils/misc.js';

type MessagePayload = {
  user: string;
  userColor: string;
  messageId: string;
  message: string;
};

export class OverlayRenderer<OS extends OverlaySettings, CS extends object> implements RendererInstance<CS> {
  constructor(private options: RendererInstanceOptions<OS, CS>) {}

  async init() {
    await this.initChatListen();
    // Iterate over every loaded plugin, and call `renderOverlay` to manipulate the Overlay view

    this.options.pluginManager.plugins.forEach(plugin => {
      try {
        plugin.renderOverlay?.(this.options.renderOptions);
      } catch (err) {
        if (err instanceof Error) {
          throw new Error(
            `Failed hook into \`renderOverlay\` for Plugin: ${plugin.name}<br /><br /><pre>${err.stack}</pre>`
          );
        }
      }
    });
  }

  async initChatListen() {
    const channelName = this.options.settingsManager.settings.channelName;

    if (!channelName) {
      return;
    }

    const client = new tmiJs.Client({
      channels: [channelName]
    });

    try {
      await client.connect();
      client.on('message', this.handleMessage);

      loadAssets('twitch');
      loadAssets(channelName);
    } catch (err) {
      const myError = err as Error;
      throw new Error('Could not connect to chat: ' + myError.message);
    }
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
    RenderTemplate(
      this.options.renderOptions.elements!['container'],
      this.options.renderOptions.templates!['chat-message'],
      data
    );

    Splitting({ target: `[data-message-id="${data.messageId}"]` });
  }

  removeOutOfBoundsMessages() {
    const container = this.options.renderOptions.elements!['container'];

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
