import Splitting from 'https://cdn.skypack.dev/splitting';
import { loadAssets, replaceEmotes } from 'https://esm.run/tmi-emote-parse';

const DEFAULT_COLORS = [
  '#b52d2d',
  '#5e5ef2',
  '#5cb55c',
  '#21aabf',
  '#FF7F50',
  '#9ACD32',
  '#FF4500',
  '#2E8B57',
  '#DAA520',
  '#D2691E',
  '#5F9EA0',
  '#1E90FF',
  '#FF69B4',
  '#8A2BE2',
  '#00FF7F'
];

const domParser = new DOMParser();

const HashCode = str => str.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

const GetColorForUsername = userName => DEFAULT_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_COLORS.length - 1)];

export default class Overlay {
  #templateId = 'chat-message-template';
  #containerId = 'chat-container';

  #channel;
  #template;
  /** @type {HTMLElement} */
  #containerEl;

  init() {
    this.#loadProps();
    this.#initChatListen();
    this.#prepHandlebars();
  }

  #loadProps() {
    const params = new URL(location.href).searchParams;
    this.#channel = params.get('channel');
    this.#containerEl = document.getElementById(this.#containerId);
  }

  #initChatListen() {
    const client = new tmi.Client({
      channels: [this.#channel]
    });

    client.connect().catch(console.error);
    client.on('message', this.#handleMessage);

    loadAssets('twitch');
    loadAssets(this.#channel);
  }

  #prepHandlebars() {
    this.#template = Handlebars.compile(document.getElementById(this.#templateId).innerHTML, { noEscape: true });
  }

  #handleMessage = (channel, userstate, message, self) => {
    if ('chat' !== userstate['message-type']) {
      return;
    }

    const transformedMessage = replaceEmotes(message, userstate, channel, self);

    this.#renderMessage({
      user: userstate['display-name'],
      userColor: userstate.color || GetColorForUsername(userstate['display-name']),
      messageId: userstate.id,
      message: transformedMessage
    });

    this.#removeOutOfBoundsMessages();
  };

  #renderMessage(data) {
    const renderedTemplate = this.#template(data);

    // Parse the rendered template as HTML
    const newDocument = domParser.parseFromString(renderedTemplate, 'text/html');
    const { firstChild: appendChild } = newDocument.body;

    // Inject the HTML into the container
    this.#containerEl.appendChild(appendChild);

    // Split for styling
    Splitting({ target: `[data-message-id="${data.messageId}"]` });
  }

  #removeOutOfBoundsMessages() {
    /** @type {HTMLElement[]} */
    const children = [...this.#containerEl.querySelectorAll('.chat-message:not(.removing)')];

    for (let childIdx = 0; childIdx < children.length; childIdx++) {
      /** @type {HTMLElement} */
      const element = children[childIdx];

      const removeChild = event => {
        this.#containerEl.removeChild(event.currentTarget);
        event.currentTarget.removeEventListener('animationend', removeChild, true);
      };

      const parentRect = element.parentNode.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const isOutOfBounds = elementRect.top < parentRect.top;

      if (isOutOfBounds) {
        const child = children.shift();
        child.classList.add('removing');
        child.addEventListener('animationend', removeChild, true);
      }
    }
  }
}
