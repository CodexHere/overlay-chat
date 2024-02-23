/**
 * Helpers for Serializing and Deserializing JSON <-> URI String
 * 
 * @module
 */

import set from 'lodash.set';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { BOOLEAN_FALSES, BOOLEAN_TRUES, IsValidValue } from './misc.js';

/**
 * Default parameters that should always exist in the Query String for this Module to properly operate.
 */
export type DefaultQueryString = {
  /** Tells the [De]Serializing process whether to handle I/O as URI, or a Compressed String */
  format?: 'compressed' | 'uri';
  /** If `format` is `compressed` then this should hold the compressed content. */
  data?: string;
};

export const BaseUrl = () => {
  const url = new URL(location.href.replaceAll('#', ''));
  // Combined URL with path, without traliing slash
  return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
};

export const QueryStringToJson = <SettingsType extends DefaultQueryString>(urlHref: string): SettingsType => {
  const params = new URL(urlHref.replaceAll('#', '')).searchParams;

  const format = (params.get('format') as SettingsType['format']) ?? 'uri';
  const data = params.get('data');
  const formatIsParsed = ['compressed'].includes(format);

  params.delete('data');
  params.delete('format');

  let settings = {} as SettingsType;

  if (formatIsParsed && !data) {
    throw new Error('URI Data Format is a compressed/processed format, and missing any actual Data');
  }

  try {
    if ('compressed' === format) {
      settings = JSON.parse(decompressFromEncodedURIComponent(data!)) as SettingsType;
    }

    // If we decompressed, then we also want to spread any other top-level params onto
    // the JSON output object. Also ensure a good `format` value with fallback above.
    settings = { ...settings, ...paramsToJson(params), format };

    return settings;
  } catch (error) {
    throw new Error('Could not deserialize Query String to JSON');
  }
};

/**
 * Builds a final form of a param, coercing true/false values to actual booleans
 */
const buildParam = <SettingsType, SettingsKey extends keyof SettingsType>(
  paramValue: SettingsType[SettingsKey]
): SettingsType[SettingsKey] => {
  const isTrue = BOOLEAN_TRUES.includes(paramValue as string);
  const isFalse = BOOLEAN_FALSES.includes(paramValue as string);

  if (isTrue || isFalse) {
    paramValue = ((isTrue && !isFalse) || !(!isTrue && isFalse)) as SettingsType[SettingsKey];
  }

  return paramValue;
};

/**
 * Converts a URLSearchParams to our desired JSON structure
 */
const paramsToJson = <SettingsType, SettingsKey extends keyof SettingsType>(params: URLSearchParams) => {
  const options: SettingsType = {} as SettingsType;

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

export const JsonToQueryString = <SettingsType extends DefaultQueryString>(json: SettingsType): string => {
  const format = json.format ?? 'uri';
  delete json.format;

  try {
    let settings = JSON.stringify(json);

    switch (format) {
      case 'compressed':
        settings = 'data=' + compressToEncodedURIComponent(settings);
        break;

      case 'uri':
      default:
        settings = jsonToCustomQueryString(json);
    }

    settings += `&format=${format}`;

    return settings;
  } catch (err) {
    throw new Error('Could not serialize JSON to Query String');
  }
};

const jsonToCustomQueryString = <SettingsType extends DefaultQueryString>(json: SettingsType) =>
  Object.entries(json)
    .reduce<string[]>((kvp, [propName, propVal]) => {
      kvp.push(...buildObjectString(propName, propVal));
      return kvp;
    }, [])
    .join('&');
