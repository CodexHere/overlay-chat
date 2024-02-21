/**
 * Helpers that just couldn't find it's own namespace
 *
 * @module
 */

/**
 * Values that equate to `Boolean` `true` values.
 *
 * @type string[]
 */
export const BOOLEAN_TRUES = ['true', 'yes', 't', 'y', 'on', 'enable', 'enabled'];

/**
 * Values that equate to `Boolean` `false` values.
 *
 * @type string[]
 */
export const BOOLEAN_FALSES = ['false', 'no', 'f', 'n', 'off', 'disable', 'disabled'];

/**
 * Default colors for Twitch Username handles.
 *
 * @type string[]
 */
export const DEFAULT_TWITCH_COLORS = [
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

/**
 * Generate a HashCode value for an input string.
 *
 * > This is not very exhaustive, does not avoid collissions, and is a very weak hash calculation!
 *
 * @param input Input String to generate a Hash
 */
export const HashCode = (input: string) =>
  input.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

/**
 * Generates a hash code for the Username, and indexes the `DEFAULT_TWITCH_COLORS` array
 * to retrieve a color.
 *
 * This function is idempotent!
 *
 * @param userName Username input to get a color
 */
export const GetColorForUsername = (userName: string) =>
  DEFAULT_TWITCH_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_TWITCH_COLORS.length - 1)];

/**
 * Simple Debounce wrapper.
 *
 * Delay calling a function by some number, every time the function is called the delay is restarted.
 *
 * @param callback - Function to delay calling
 * @param wait - Amount (in milliseconds) to wait before calling the `callback`
 */
export function debounce<T extends (...args: any[]) => any>(callback: T, wait: number) {
  let timeoutId: number;

  const callable = (...args: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };

  return <T>(<any>callable);
}

/**
 * Exhaustive evaluation on a value to determine if the value truly is "valid" for use.
 *
 * Essentially, we don't consider undefined or empty values, nor empty arrays as "valid."
 *
 * @param value - Value to test if "Valid."
 */
export const IsValidValue = (value: any) =>
  (undefined !== value && null !== value && '' !== value) || (Array.isArray(value) && 0 == value.length);
