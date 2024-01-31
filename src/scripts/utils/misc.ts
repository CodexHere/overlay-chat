export const DEFAULT_COLORS = [
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

export const HashCode = (str: string) => str.split('').reduce((s, c) => (Math.imul(31, s) + c.charCodeAt(0)) | 0, 0);

export const GetColorForUsername = (userName: string) =>
  DEFAULT_COLORS[Math.abs(HashCode(userName)) % (DEFAULT_COLORS.length - 1)];

export function debounce<T extends (...args: any[]) => any>(callback: T, wait: number) {
  let timeoutId: number;

  const callable = (...args: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };

  return <T>(<any>callable);
}

const indexRegExp = new RegExp(/(.*)\[\d*\]$/);

export const RemoveArrayIndex = (paramName: string) => paramName.replace(indexRegExp, '$1');

export const IsValidValue = (value: any) =>
  (undefined !== value && null !== value && '' !== value) || (Array.isArray(value) && 0 == value.length);

export const GetLocalStorageItem = (name: string) => {
  const data = globalThis.localStorage.getItem(name);
  return data ? JSON.parse(data) : null;
};

export const SetLocalStorageItem = (name: string, value: any) =>
  globalThis.localStorage.setItem(name, JSON.stringify(value));
