import set from 'lodash.set';
import { BOOLEAN_FALSES, BOOLEAN_TRUES, IsValidValue } from './misc.js';

export const BaseUrl = () => {
  const url = new URL(location.href.replaceAll('#', ''));
  // Combined URL with path, without traliing slash
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
};

export const QueryStringToJson = <SettingsType, SettingsKey extends keyof SettingsType>(
  urlHref: string
): SettingsType => {
  const options: SettingsType = {} as SettingsType;
  const params = new URL(urlHref.replaceAll('#', '')).searchParams;

  const buildParam = (paramValue: SettingsType[SettingsKey]): SettingsType[SettingsKey] => {
    const isTrue = BOOLEAN_TRUES.includes(paramValue as string);
    const isFalse = BOOLEAN_FALSES.includes(paramValue as string);

    if (isTrue || isFalse) {
      paramValue = ((isTrue && !isFalse) || !(!isTrue && isFalse)) as SettingsType[SettingsKey];
    }

    return paramValue;
  };

  params.forEach((param, paramName) => {
    const builtParam = buildParam(param as SettingsType[SettingsKey]);
    set(options as object, paramName, builtParam);
  });

  return options;
};

const buildObjectString = (prefix: string, propVal: any) => {
  let kvp: string[] = [];

  // Our object is an Array, so recursively process the properties!
  if (true === Array.isArray(propVal)) {
    propVal.forEach((subValue: any, idx: number) => {
      kvp.push(...buildObjectString(`${prefix}[${idx}]`, subValue));
    });
  } else {
    if (IsValidValue(propVal)) {
      // KVP is simple prefix=someVal
      kvp.push(`${prefix}=${encodeURIComponent(propVal)}`);
    }
  }

  return kvp;
};

export const JsonToQuerystring = (json: Record<string, any>) =>
  Object.entries(json)
    .reduce<string[]>((kvp, [propName, propVal]) => {
      kvp.push(...buildObjectString(propName, propVal));
      return kvp;
    }, [])
    .join('&');
