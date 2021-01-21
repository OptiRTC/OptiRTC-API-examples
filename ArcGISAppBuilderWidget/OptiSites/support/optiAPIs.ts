type IPrimitive = string | number | boolean;

// About unfetch:
// * A ponyfill for fetch()
// * Most modern browsers implement fetch().
//   In particular, the browsers supported by ArcGIS's AppBuilder
//   (https://doc.arcgis.com/en/web-appbuilder/create-apps/supported-browsers.htm) support
//   fetch().  In particular note that IE11 is not supported by ArcGIS's AppBuilder.
// * So this ponyfill is likely not needed. But here for safety.
// * Alternatively the more complete `cross-fetch` could be used instead of `unfetch`
//   but `unfetch` is small and has features of fetch we use. And for most browsers, the
//   ponyfill is not even used.

//@ts-ignore: unfetch exists
import unfetch from '../js/unfetch';
const _fetch: typeof fetch = fetch || unfetch;

export type IRequestParams = Partial<Record<string, IPrimitive | IPrimitive[]>>;

interface IPagedResponse<T> {
  Count: number;
  Items: T[];
  NextPageLink?: string;
}

const optiPublicAPIHost = 'https://public.optirtc.com';
const optiPublicAPIPathPrefix = '/api/'
const baseAPIUrl = `${optiPublicAPIHost}${optiPublicAPIPathPrefix}`;

//primitiveToString(): converts primitive value to string
//* Useful for compose UrlSearchParams
const primitiveToString = (v?: IPrimitive): string | null =>
  typeof v === 'string'
    ? v
    : (typeof v === 'boolean' || typeof v === 'number') ? `${v}`
    : null;

//appendV(): Used by composeUrlSearchParams
const appendV = (r: URLSearchParams, k: string, v?: IPrimitive) => {
  const s = primitiveToString(v);
  if (typeof s === 'string') {
    r.append(k, s);
  }
};

//composeUrlSearchParams:
//* Used by optiAPIGet()
//* Creates URLSearchParams and appends params to it
//* Takes care of transforming IPrimitive | IPrimitive[] before appending
const composeUrlSearchParams = (key: string, params: IRequestParams = {}): URLSearchParams =>
  Object.keys(params).reduce<URLSearchParams>((r, k) => {
    const vOrVs = params[k];
    if (Array.isArray(vOrVs)) {
      vOrVs.forEach(v => appendV(r, k, v));
    } else {
      appendV(r, k, vOrVs);
    }
    return r;
  }, new URLSearchParams({key}));

//optiAPIGet():
//* requests data from Opti API.
export const optiAPIGet = async <R>(endpoint: string, apiKey?: string, params?: IRequestParams): Promise<R> => {
  const url = new URL(endpoint.startsWith(baseAPIUrl) ? endpoint : `${baseAPIUrl}${endpoint}`);
  if (apiKey) {
    url.search = composeUrlSearchParams(apiKey, params).toString();
  }
  const response = await _fetch(url.toString());

  if (!(response.status >= 200 && response.status < 300)) {
    endpoint = url.pathname.slice(optiPublicAPIPathPrefix.length);
    const search = url.search;
    throw Object.assign(
      new Error(`GET ${endpoint}${search}: XHR Status ${response.status}: ${response.statusText}`),
      { request: {endpoint, search}, response }
    );
  }
  return response.json();
};

//isPagedResponse():
//* inspects a response to determine if it is a paged response
const isPagedResponse = <R>(response: R | IPagedResponse<R>): response is IPagedResponse<R> =>
  response && Array.isArray((response as IPagedResponse<R>).Items);

//getAllOptiItems():
//* an AsyncIterable factory that follows each paged response to yield each response's chunk of items
export const getAllOptiItems = <T>(
  apiKey: string,
  endpoint: string,
  params?: IRequestParams
): AsyncIterable<T[]> => ({
  async *[Symbol.asyncIterator]() {
    let response: T | IPagedResponse<T>;
    try {
      response = await optiAPIGet(endpoint, apiKey, params);
    } catch (e) {
      console.error(e);
      return; //no items yielded
    }
    while (response) {
      if (isPagedResponse(response)) {
        yield response.Items;
        if (response.NextPageLink) {
          try {
            response = await optiAPIGet<T>(response.NextPageLink);
          } catch (e) {
            console.error('next page error:', e);
            break; //stop yielding
          }
        } else {
          break; //done
        }
      } else {
        yield [response];
        break; //done
      }
    }
  }
});

export const getAllOptiItemsFlattened = <T>(
  apiKey: string,
  endpoint: string,
  params?: IRequestParams
): AsyncIterable<T> => ({
  async *[Symbol.asyncIterator]() {
    for await (const chunk of getAllOptiItems<T>(apiKey, endpoint, params)) {
      yield* chunk;
    }
  }
});
