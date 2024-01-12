export class URI {
  static BaseUrl() {
    const url = new URL(location.href.replaceAll('#', ''));
    return `${url.origin}${url.pathname}`;
  }

  static QueryStringToJson = <SettingsType, SettingsKey extends keyof SettingsType>(urlHref: string): SettingsType => {
    const options: SettingsType = {} as SettingsType;
    const params = new URL(urlHref.replaceAll('#', '')).searchParams;

    params.forEach((param, paramName) => {
      options[paramName as SettingsKey] = param as SettingsType[SettingsKey];
    });

    return options;
  };

  static JsonToQueryString = (json: any) =>
    Object.keys(json)
      .reduce<string[]>((kvp, key) => {
        json[key] && kvp.push(key + '=' + json[key]);
        return kvp;
      }, [])
      .join('&');
}
