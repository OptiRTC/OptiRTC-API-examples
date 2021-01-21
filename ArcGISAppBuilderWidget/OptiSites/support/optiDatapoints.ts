import {getAllOptiItemsFlattened} from './optiAPIs';
import {
  IRequestParams,
  getAllOptiItems
} from './optiAPIs';

interface IDatapointRequestParams extends IRequestParams {
  dataStreamId: number;
  utcModern?: string;
  tss?: number;
  top?: number;
}

interface IDataPointAlarmValue {
  alarmResourceId: number; //integer
  alarmMessage?: string;
  alarmResourceName?: string;
}

interface IDataPointValue<T = any> {
  //The identity of the resource metadata (see /api/datamap/) of this value.
  resourceId: number; //integer

  //The state of the resource. This can be an array of one or more of any object type described by OptiRTC metadata.
  //See /api/optidatatype/ for the set of possible resource types supported by OptiRTC.
  value?: T;

  //During ingestion or production of this DataPoint, if any data validation or inspection failed,
  //the point was marked as non-operational, and an error code and string representation of the
  //offending value are stored in this property.
  //A more detailed message will be available via the /api/cyberqa/ endpoint for this DataStream and this DataPoint.id.
  //Some DataPointVerbosities include the quality parameter in the response.
  //For each resource represented by value, there may be a representation of the quality.
  //If value is a single resource, quality will also be a single resource.
  //If value is many resources that share a single timestamp, each resource will have a quality designation.
  quality?: any;

  //After data is ingested into OptiRTC, project curators are able to update the latest version of each DataPoint,
  //and these updated DataPoints are used to recalculate any downstream values that are dependent on them as well as
  //becoming the operational value of record for display and export.
  //The original value of the raw DataPoint is stored in OptiRTC and is immutible.
  //Some DataPointVerbosity requests include this original value in the response.
  //This property is null and not included in the response if the DataPoint has not been updated
  //since it was originally \nseen by the platform.
  originalValue?: T;

  //First-level downstream alarms or first-level downstream alarms of this resource's top-level raw resource
  relatedAlarms?: IDataPointAlarmValue[];
}

export interface IDatapointJSON<T> {
  //Within a dataStream, DataPoints are individual snapshots of state in time.
  //The timeValue is converted into a precise id, which is used for submitting updates to dataPoint
  //objects along with the objects' dataStream id.
  //Because DataPoint ids are time-coordinates, methods can allow for batch transactions over periods of time.
  id?: string;
  timeValue: string; //ISO 8601 string

  // Optional - if a datastream has undergone a transformation, this is the resource id represented by the time value
  timeValueResourceId?: number; //integer

  //If the resource is directly ingested from an external-to-OptiRTC source
  //(i.e. it was not produced by a calculation running in OptiRTC),
  //and the request verbosity includes quality information,
  //this property will contain an OptiRTC name for the network status.
  networkStatus?: string;

  //Representation of an object's state at a moment's (timeValue) time.
  //For a given datastream, value is always the same object.
  //However, for some datastreams value will be a single property,
  //while for others it will be a key/value collection in which the key is a unique string name
  //across the datastream and the value is a primitive.
  //The key will associate with the {parameter}_{channel}_{process} properties of
  //the dataMap objects available at the /api/dataMap/ endpoint.
  value?: IDataPointValue<T>[];
}

const datapointEndpoint = 'datapoint';

export const getDatapoints = <T>(apiKey: string, params: IDatapointRequestParams): AsyncIterable<IDatapointJSON<T>> =>
  getAllOptiItemsFlattened<IDatapointJSON<T>>(apiKey, datapointEndpoint, params);

export const getDatapointChunks = <T>(
  apiKey: string,
  params: IDatapointRequestParams
): AsyncIterable<IDatapointJSON<T>[]> => getAllOptiItems<IDatapointJSON<T>>(apiKey, datapointEndpoint, params);
