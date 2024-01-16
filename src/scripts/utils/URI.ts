export class URI {
  static BaseUrl() {
    const url = new URL(location.href.replaceAll('#', ''));
    return `${url.origin}${url.pathname}`;
  }

  static QueryStringToJson = <SettingsType, SettingsKey extends keyof SettingsType>(urlHref: string): SettingsType => {
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

  static JsonToQueryString = (json: any) =>
    Object.keys(json)
      .reduce<string[]>((kvp, key) => {
        const values = Array.isArray(json[key]) ? (json[key] as []) : [json[key]];
        values.forEach(value => {
          value && kvp.push(key + '=' + encodeURIComponent(value));
        });
        return kvp;
      }, [])
      .join('&');
}
