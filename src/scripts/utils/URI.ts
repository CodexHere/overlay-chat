/**
 * Helpers for Serializing and Deserializing JSON <-> URI String
 *
 * @module
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { IsValidValue, PathSet } from './Primitives.js';
import { BOOLEAN_FALSES, BOOLEAN_TRUES } from './Values.js';

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

export const QueryStringToJson = <CustomData extends DefaultQueryString>(urlHref: string): CustomData => {
  const params = new URL(urlHref.replaceAll('#', '')).searchParams;

  const format = (params.get('format') as CustomData['format']) ?? 'uri';
  const data = params.get('data');
  const formatIsParsed = ['compressed'].includes(format);

  params.delete('data');
  params.delete('format');

  let customData = {} as CustomData;

  if (formatIsParsed && !data) {
    throw new Error('URI Data Format is a compressed/processed format, and missing any actual Data');
  }

  try {
    if ('compressed' === format) {
      customData = JSON.parse(decompressFromEncodedURIComponent(data!)) as CustomData;
    }

    // If we decompressed, then we also want to spread any other top-level params onto
    // the JSON output object. Also ensure a good `format` value with fallback above.
    customData = { ...customData, ...paramsToJson(params), format };

    return customData;
  } catch (error) {
    throw new Error('Could not deserialize Query String to JSON');
  }
};

/**
 * Builds a final form of a param, coercing true/false values to actual booleans
 */
const buildParam = <CustomData, DataKey extends keyof CustomData>(
  paramValue: CustomData[DataKey]
): CustomData[DataKey] => {
  const isTrue = BOOLEAN_TRUES.includes(paramValue as string);
  const isFalse = BOOLEAN_FALSES.includes(paramValue as string);

  if (isTrue || isFalse) {
    paramValue = ((isTrue && !isFalse) || !(!isTrue && isFalse)) as CustomData[DataKey];
  }

  return paramValue;
};

/**
 * Converts a URLSearchParams to our desired JSON structure
 */
const paramsToJson = <CustomData extends Record<string, any>, DataKey extends keyof CustomData>(
  params: URLSearchParams
) => {
  const options: CustomData = {} as CustomData;

  params.forEach((param, paramName) => {
    const builtParam = buildParam(param as CustomData[DataKey]);
    PathSet(options, paramName, builtParam);
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

export const JsonToQueryString = <CustomData extends DefaultQueryString>(json: CustomData): string => {
  const format = json.format ?? 'uri';
  delete json.format;

  try {
    let customData = JSON.stringify(json);

    switch (format) {
      case 'compressed':
        customData = 'data=' + compressToEncodedURIComponent(customData);
        break;

      case 'uri':
      default:
        customData = jsonToCustomQueryString(json);
    }

    customData += `&format=${format}`;

    return customData;
  } catch (err) {
    throw new Error('Could not serialize JSON to Query String');
  }
};

const jsonToCustomQueryString = <CustomData extends DefaultQueryString>(json: CustomData) =>
  Object.entries(json)
    .reduce<string[]>((kvp, [propName, propVal]) => {
      kvp.push(...buildObjectString(propName, propVal));
      return kvp;
    }, [])
    .join('&');
