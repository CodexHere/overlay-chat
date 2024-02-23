/**
 * Helpers for retrieving and setting complex objects as JSON strings into LocalStorage
 * 
 * @module
 */

/**
 * Gets a LocalStorage Item as parsed JSON.
 *
 * @typeParam ReturnType - The expected return type from LocalStorage.
 * @param name - Name of the LocalStorage item.
 */
export const GetLocalStorageItem = <ReturnType>(name: string): ReturnType => {
  const data = globalThis.localStorage.getItem(name);
  return data ? JSON.parse(data) : null;
};

/**
 * Sets a LocalStorage Item as stringified JSON.
 *
 * @param name - Name of the LocalStorage item.
 * @param value - Value to Store.
 */
export const SetLocalStorageItem = (name: string, value: any) =>
  globalThis.localStorage.setItem(name, JSON.stringify(value));
