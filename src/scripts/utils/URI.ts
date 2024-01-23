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

  params.forEach((param, paramName) => {
    let paramValue = options[paramName as SettingsKey];

    // If we have an existing value...
    //  and it's an array, append to it
    if (paramValue) {
      if (Array.isArray(paramValue)) {
        paramValue.push(param);
      } else {
        // Exists, but not an array, turn it into one
        paramValue = [paramValue, param] as SettingsType[SettingsKey];
      }
    } else {
      // Never existed, assume single item parameter
      paramValue = param as SettingsType[SettingsKey];
    }

    options[paramName as SettingsKey] = paramValue;
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
