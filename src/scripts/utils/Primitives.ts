export type DebounceResult = {
  handler: (...args: any) => void;
  cancel: () => void;
};
/**
 * Simple Debounce wrapper.
 *
 * Delay calling a function by some number, every time the function is called the delay is restarted.
 *
 * @param callback - Function to delay calling
 * @param wait - Amount (in milliseconds) to wait before calling the `callback`
 */
export function debounce<T extends (...args: any[]) => any>(callback: T, wait: number): DebounceResult {
  let timeoutId: number;

  const cancel = () => clearTimeout(timeoutId);
  const handler = (...args: any) => {
    cancel();
    timeoutId = setTimeout(() => callback(...args), wait);
  };

  return {
    handler,
    cancel
  };
}

/**
 * Generate a HashCode value for an input string.
 *
 * > This is not very exhaustive, does not avoid collissions, and is a very weak hash calculation!
 *
 * @param input - Input String to generate a Hash
 */
export const HashCode = (input: string) =>
  input.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0); /**
 * Exhaustive evaluation on a value to determine if the value truly is "valid" for use.
 *
 * Essentially, we don't consider undefined or empty values, nor empty arrays as "valid."
 *
 * @param value - Value to test if "Valid."
 */

/**
 * Determines whether a value is "Valid."
 *
 * This essentially means the value has SOME form of value, and isn't empty.
 *
 * @param value - Value to evaluate.
 */
export const IsValidValue = (value: any) =>
  (undefined !== value && null !== value && '' !== value) || (Array.isArray(value) && 0 == value.length);

/**
 * Converts a string to an ID-style output.
 *
 * @param input - String to ID-ify.
 */
export const ToId = (input: string) => input.toLocaleLowerCase().replaceAll(/\W/g, '_');

/**
 * Get an Array of strings represeting the path.
 *
 * Checks if the `path` is String or Array.
 * The Regex ensures that we do not have '.' or brackets in the array output.
 * Regex explained: https://regexr.com/58j0k
 *
 * @param path - Path to convert to Array.
 */
const getPathArray = (path: string | string[]) => (Array.isArray(path) ? path : path.match(/([^[.\]])+/g) ?? []);

/**
 * Get a Value at the given Path.
 *
 * ```js
 * const simpleObject   = { a: { b: 2 } };
 * const complexObject  = { a: [{ bar: { c: 3 } }] };
 * const falsyObject    = { a: null, b: undefined, c: 0 };
 *
 * console.log(PathGet(simpleObject, 'a.b'))                   // => 2
 * console.log(PathGet(simpleObject, 'a.bar.c', 'default'))    // => 'default'
 * console.log(PathGet(complexObject, 'a[0].bar.c'))           // => 3
 * console.log(PathGet(complexObject, ['a', '0', 'bar', 'c'])) // => 3
 * console.log(PathGet(complexObject, 'a.bar.c', 'default'))   // => 'default'
 * console.log(PathGet(complexObject, null))                   // => undefined
 * console.log(PathGet(falsyObject, 'a', 'default'))           // => null
 * console.log(PathGet(falsyObject, 'b', 'default'))           // => 'default'
 * console.log(PathGet(falsyObject, 'c', 'default'))           // => zero
 * ```
 *
 * Adapted from: https://youmightnotneed.com/lodash#get
 *
 * @param scanObj - Object to scan for the `path`.
 * @param path - Path to scan the `scanObj` for.
 * @param defaultValue - Default Value to use if there isn't a value at the `path`.
 * @typeParam ReturnType - Type of the value to return (Default Value must be same value)
 */
export const PathGet = <ReturnType>(
  scanObj: Record<string, any>,
  path: string | string[],
  defaultValue?: ReturnType
): ReturnType | undefined => {
  // If path is not defined or it has false value
  if (!path) {
    return undefined;
  }

  const pathArray = getPathArray(path);
  // Find value
  const result = pathArray.reduce((prevObj, key) => prevObj && prevObj[key], scanObj) as ReturnType;
  // If found value is undefined return Default Value; otherwise return the value
  return result === undefined ? defaultValue : result;
};

/**
 * Set a Value at the given Path.
 *
 * ```js
 * const object = { a: [{ bar: { c: 3 } }] }
 *
 * PathSet(object, 'a[0].bar.c', 4)
 * console.log(object.a[0].bar.c) // => 4
 * PathSet(object, ['x', '0', 'y', 'z'], 5)
 * console.log(object.x[0].y.z) // => 5
 * ```
 *
 * Adapted from: https://youmightnotneed.com/lodash#set
 *
 * @param scanObj - Object to scan for the `path`.
 * @param path - Path to scan the `scanObj` for.
 * @param value - Value to set at the `path`.
 */
export const PathSet = <ScanType extends Record<string, any>, SetType extends ScanType[keyof ScanType]>(
  scanObj: ScanType,
  path: string | string[],
  value: SetType
) => {
  const pathArray = getPathArray(path);

  pathArray.reduce((acc, _key, idx) => {
    const key = _key as keyof ScanType;
    const lastIter = idx === pathArray.length - 1;

    // Create nested `key` if `undefined`
    if (acc[key] === undefined) {
      // If the `key` is a Number, set as an Array, otherwise as an object.
      acc[key] = (isNaN(Number(key)) ? [] : {}) as SetType;
    }

    // If we're on the last of the path, set the value.
    if (lastIter) {
      acc[key] = value;
    }

    return acc[key];
  }, scanObj);
};

/**
 *
 * ```js
 * const object = { a: [{ bar: { c: 7, d: 6 } }] }
 *
 * PathUnset(object, 'a[0].bar.c');
 * console.dir(object); // => { 'a': [{ 'bar': { 'd': 6 } }] };
 * ```
 * @param scanObj - Object to scan for the `path`.
 * @param path - Path to scan the `scanObj` for.
 */
export const PathUnset = <ScanType extends Record<string, any>>(scanObj: ScanType, path: string | string[]) => {
  const pathArray = getPathArray(path);

  pathArray.reduce((acc, key, i) => {
    if (!acc[key]) {
      return acc;
    }

    if (i === pathArray.length - 1) {
      delete acc[key];
    }

    return acc[key];
  }, scanObj);
};
