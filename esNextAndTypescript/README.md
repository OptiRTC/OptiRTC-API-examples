# Typescript / Modern Javascript Examples

The following are pointers to useful examples of functions for requesting data
from the Public API using [Typescript](https://www.typescriptlang.org/).

These examples make use of the [WHATWG Fetch API](https://fetch.spec.whatwg.org/).
The fetch API is [available](https://caniuse.com/?search=fetch) in modern browsers.

As well, these examples make use of ES2018's [Asynchronous
Iteration](https://exploringjs.com/impatient-js/ch_async-iteration.html) (See
[Async Iterable browser support](https://caniuse.com/mdn-javascript_builtins_asynciterator)). The
advantage of implementing an `AsyncIterable` result is that iteration in the
examples below is required before a Public API request is made and if iteration stops, 
new requests stop.  So requests are only made on demand.

## API requests

These examples of API requests can be used for a number of the Public API's
endpoints.  Typically these will be used to implement functions like those
described below in [Data streams](#data-streams) & [Data points](#data-points)

See [optiAPIs.ts](../ArcGISAppBuilderWidget/OptiSites/support/optiAPIs.ts)

```typescript
// Requests data from Opti's Public API.
optiAPIGet<R>(endpoint: string, apiKey?: string, params?: IRequestParams): Promise<R>
```

```typescript
//An `AsyncIterable` factory that follows each paged response to yield each response's chunk of items.
getAllOptiItems<T>(apiKey: string, endpoint: string, params?: IRequestParams): AsyncIterable<T[]>
```

> Example usage:
>
> ```typescript
> //Iterate over datapoints for `datastreamId` from `utcModern` and time span `tss`
> for await (const pointsChunk of getAllOptiItems(apiKey, 'datapoint', {dataStreamId, utcModern, tss})) {
>   for (const point of pointsChunk) {
>      console.log(`Point @${point.timeValue}: ${point.value[0].value}`);
>   }
> }
> ```
>
> Also see `getAllOptiItemsFlattened()` below.

```typescript
//An `AsyncIterable` factory that follows each paged response and yields each item in each paged response
getAllOptiItemsFlattened<T>(apiKey: string, endpoint: string, params?: IRequestParams): AsyncIterable<T>
```

> Example usage:
>
> ```typescript
> //Iterate over datastreams available to public API key
> for await (const d of getAllOptiItems(apiKey, 'datastream')) {
>   console.log(`Datastream id: ${d.id}, title: ${d.title}`);
> }
> ```

## Data streams

See [optiDatastreams.ts](../ArcGISAppBuilderWidget/OptiSites/support/optiDatastreams.ts)

```typescript
//Returns an `AsyncIterable` of data streams from the Public API
getDatastreams(apiKey: string): AsyncIterable<IDatastreamJSON>
```

> Example usage:
>
> ```typescript
> //Iterate over datastreams available to public API key
> for await (const d of getDatastreams(apiKey)) {
>   console.log(`Datastream id: ${d.id}, title: ${d.title}`);
> }
> ```

## Data points

See [optiDatapoints.ts](../ArcGISAppBuilderWidget/OptiSites/support/optiDatapoints.ts)

```typescript
//Returns an `AsyncIterable` of data points (where values are type T) from the Public API
getDatapoints<T>(apiKey: string, params: IDatapointRequestParams): AsyncIterable<IDatapointJSON<T>>
```

> Example usage:
>
> ```typescript
> //Iterate over datapoints for `datastreamId` from `utcModern` and time span `tss`
> for await (const point of getDatapoints(apiKey, {dataStreamId, utcModern, tss})) {
>    console.log(`Point @${point.timeValue}: ${point.value[0].value}`);
> }
> ```
