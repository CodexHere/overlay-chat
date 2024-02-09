export const GetLocalStorageItem = <T>(name: string): T => {
  const data = globalThis.localStorage.getItem(name);
  return data ? JSON.parse(data) : null;
};

export const SetLocalStorageItem = (name: string, value: any) =>
  globalThis.localStorage.setItem(name, JSON.stringify(value));
