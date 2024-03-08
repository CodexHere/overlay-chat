import { HashCode } from './Primitives.js';
import { DEFAULT_TWITCH_COLORS } from './Values.js';

/**
 * Generates a hash code for the Username, and indexes the `DEFAULT_TWITCH_COLORS` array
 * to retrieve a color.
 *
 * This function is idempotent!
 *
 * @param userName - Username input to get a color
 */
export const GetColorForUsername = (userName: string) =>
  DEFAULT_TWITCH_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_TWITCH_COLORS.length - 1)];
