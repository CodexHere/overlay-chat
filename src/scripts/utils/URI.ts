import { BOOLEAN_FALSES, BOOLEAN_TRUES } from '../types.js';

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
    let existingValue = options[paramName as SettingsKey];

    const builtParam = buildParam(param as SettingsType[SettingsKey]);

    // If we have an existing value...
    //  and it's an array, append to it
    if (undefined !== existingValue) {
      if (Array.isArray(existingValue)) {
        existingValue.push(builtParam);
      } else {
        // Exists, but not an array, turn it into one
        existingValue = [existingValue, builtParam] as SettingsType[SettingsKey];
      }
    } else {
      // Never existed, assume single item parameter
      existingValue = builtParam as SettingsType[SettingsKey];
    }

    options[paramName as SettingsKey] = existingValue;
  });

  return options;
};

export const JsonToQuerystring = (json: any) =>
  Object.keys(json)
    .reduce<string[]>((kvp, key) => {
      const values = Array.isArray(json[key]) ? (json[key] as []) : [json[key]];
      values.forEach(value => {
        if (undefined !== value && null !== value && '' !== value) {
          kvp.push(key + '=' + encodeURIComponent(value));
        }
      });
      return kvp;
    }, [])
    .join('&');
