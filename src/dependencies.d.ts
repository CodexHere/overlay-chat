declare module 'tmi-emote-parse' {
  export function loadAssets(name: string): void;
  export function replaceEmotes(message: string, userstate: tmiJs.ChatUserstate, channel: string): string;
}
