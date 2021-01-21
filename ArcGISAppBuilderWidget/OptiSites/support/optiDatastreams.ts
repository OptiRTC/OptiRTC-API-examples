import {getAllOptiItemsFlattened} from './optiAPIs';
import * as GeoJSON from 'geojson';

const datastreamEndpoint = 'datastream';

interface IDatastreamJSON {
  id: number;
  title?: string;
  location?: GeoJSON.Point
  resourceId: number;
  unitAbbreviation?: string;
  unitName?: string;
  validFrom: string; //ISO8601 string
}

export const getDatastreams = (apiKey: string): AsyncIterable<IDatastreamJSON> =>
  getAllOptiItemsFlattened<IDatastreamJSON>(apiKey, datastreamEndpoint);
