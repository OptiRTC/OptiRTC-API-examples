// jIMU (WAB) imports:
//@ts-ignore jimu/BaseWidget exists
import BaseWidget from 'jimu/BaseWidget';

// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from './support/declareDecorator';

import {sortedIndex} from './support/sortedIndex';
import {noop} from './support/noop';

import {getDatastreams} from './support/optiDatastreams';
import {
  getDatapointChunks,
  IDatapointJSON
} from './support/optiDatapoints';

import {addElementEventListener} from './support/eventListenerHelpers'

//Note: momentjs is provided by AppBuilder as AMD module that can be imported
//* it is included as devDependency in package.json for its type definitions only.
//* it does not need to be added to ./js dir with other 3rd party vendor scripts
import moment from 'moment/moment';
import * as GeoJSON from 'geojson';

/// <reference types="dygraphs" /> //triple slash directive to references types in dygraphs namespace
import type _Dygraph from 'dygraphs';
type Dygraph = _Dygraph;
type DygraphConstructor = typeof _Dygraph;
//@ts-ignore ./js/dygraph exists
import Dygraph from './js/dygraph'; //In transpiled widget.js, this is the only real AMD import

//import hand written interfaces that Esri does not provide
import type {
  EsriFeatureCollectionObject,
  EsriLayerNode,
  EsriLayerStructureInstance,
  EsriWidgetManagerInstance,
  IEsriLayerStructure,
  IEsriWidgetManager
} from './interfaces/esriInterfaces';

import {waitForLayerToBeAdded} from './support/waitForLayerToBeAdded';

// dojo imports:
// import on from 'dojo/on';
import domConstruct from 'dojo/dom-construct';

//@ts-ignore: EsriLayerStructure exists but there is no type definition
import EsriLayerStructure from 'jimu/LayerStructure';

//@ts-ignore: WidgetManager exists but there is no type definition
import EsriWidgetManager from 'jimu/WidgetManager';

import EsriFeatureLayer from 'esri/layers/FeatureLayer';
import EsriField from 'esri/layers/Field'
import EsriGraphic from 'esri/graphic';
import EsriInfoTemplate from 'esri/InfoTemplate';
import type EsriPopup from 'esri/dijit/Popup';

import EsriMap from 'esri/map';
import EsriPictureMarkerSymbol from 'esri/symbols/PictureMarkerSymbol';
import EsriPoint from 'esri/geometry/Point';
import webMercatorUtils from 'esri/geometry/webMercatorUtils';
import EsriSimpleRenderer from 'esri/renderers/SimpleRenderer';
import EsriSpatialReference from 'esri/SpatialReference';
import esriGraphicsUtils from 'esri/graphicsUtils';

import type IConfig from './interfaces/config';
interface IWidget {
  baseClass: string;
  config?: IConfig;
  started: boolean;
  state: string;
  windowState: string;
  setWindowState(state: string): void;
  setState(state: string): void;
}

const OptiDateTimeFormatWithSeconds =  'MM/DD/YYYY HH:mm:ss';

const formatTimeValue = (timeValue: string) =>
  moment.utc(timeValue).local().format(OptiDateTimeFormatWithSeconds);

const tss: number = 172800; //48hrs

const optiIconRelURL = 'widgets/OptiSites/images/icon.png';

//class names (keep these synced with style.scss rules)
const optiSiteDataClassName = 'opti-site-data';
const optiSiteIntroClassName = 'opti-site-intro';
const optiLogoClassName = 'opti-logo';
const optiSiteChartsClassName = 'opti-site-charts';
const optiSiteChartClassName = 'opti-site-chart';
const dygraphContainerClassName = 'dygraph-container';
//dygraphLegendClassName: don't name 'dygraph-legend' because otherwise it would interfer with OOTB dygraph class
const dygraphLegendClassName = 'opti-site-chart-legend';
const noPointsClass = 'opti-site-chart-no-points';

const divTag = 'div';
const optiSiteDataHTMLAttributes = {class: optiSiteDataClassName};

//Some html framents used with domConstruct methods
const introHTML = `<div class="${optiSiteIntroClassName}"></div>`;
const introTitleHTML = `<h2><img src="${optiIconRelURL}" class="${optiLogoClassName}">Opti Site</h2>`;
//eslint-disable-next-line max-len
const introTextHTML = 'Opti uses real-time weather forecast and sensor data to predict and automate decisions that optimize the site\'s stormwater infrastructure.  Real-time data from the last 72-hours from this site is provided in the graphs below. For more information, please visit <a target="_blank" rel="noopener noreferrer" href="https://optirtc.com">https://optirtc.com</a>.';
const maximizeViewHTML = '<a href="#">Maximize View</a>'; //click handler added with js
const restoreViewHTML = '<a href="#">Restore View</a>'; //click handler added with js
const chartsHTML = `<div class="${optiSiteChartsClassName}"></div>`;
const chartHTML = `<div class="${optiSiteChartClassName}"></div>`;
const chartTitleHTML = (title: string, unit?: string) => `<h2><b>${title}${unit ? `: <i>(${unit})</i>` : ''}</b></h2>`;
const dygraphLegendHTML = `<div class="${dygraphLegendClassName}"></div>`;
const dygraphContainerHTML = `<div class="${dygraphContainerClassName}"></div>`;
const loadingHTML = '<p>Loading...</p>';
const noPointsHTML = `<p class="${noPointsClass}">No points.</p>`;

type ITimeAndValuePair = [Date, number]

type INewPointsHandler = (
  filteredAccPoints: Iterable<ITimeAndValuePair>,
  stoppedIterationEarly: boolean
) => void;

interface IInfoPopupLoadingState {
  loadingId: number;
  loaded: boolean;
  shouldStopLoading: boolean;
  disposeDygraph?: () => void;
}

interface IChartData {
  dataStreamId: number;
  title: string; //site name and `-` and surrounding whitespace removed from datastream.title
  product?: string;
  unit?: string;

  //Note: asyncPointsUpdates yields the filtered accumulated points after processing each chunk of points
  asyncPointsUpdates: AsyncIterable<Iterable<ITimeAndValuePair>>;

  startFormatted?: string; //now less 48hrs
  endFormatted?: string; //now
  minValue?: number; //min value from points
  maxValue?: number; //max value from points
}

//@ts-ignore: It is fine to subtract dates. Result is number
const compareTimeAndValuePairs = (a: ITimeAndValuePair, b: ITimeAndValuePair) => a[0] - b[0];

interface IFilteredAccPointsResult {
  stopAllIteration: () => void; //stop all iterators created by filteredAccPoints
  filteredAccPoints: Iterable<ITimeAndValuePair>;
}

//filterAccPoints():
//* Used by accumulatePoints() below which is used by IChartData.asyncPointsUpdates()
//* Note: The unfilteredAccPoints is maintained because new points may not be inserted in middle
//  and break previous filtered results.
//* Result:
//  * stopAllIteration():
//    * Called to stop filtering (because a new chunk of points arrived and we'll get new filtedAccPoints)
//  * The Iterable of filteredAccPoints (an iterable so filtering is on demand)
const filterAccPoints = (
  unfilteredAccPoints: ITimeAndValuePair[]
): IFilteredAccPointsResult => {
  let done: boolean;
  return {
    stopAllIteration: () => done = true,
    filteredAccPoints: {
      *[Symbol.iterator]() {
        let skippedP: ITimeAndValuePair | null = null;
        for (const p of unfilteredAccPoints) {
          if (done) {
            break; //stop iterating was called
          }
          if (!skippedP || skippedP[1] !== p[1]) {
            if (skippedP) {
              yield skippedP;
              skippedP = null;
            }
            yield p;
          } else {
            skippedP = p;
          }
        }
        if (skippedP) {
          yield skippedP;
        }
      }
    }
  };
};

//accumulatePoints():
//* (static method) helper to create ITimeAndValuePair, accumulate it in sorted order
//* Note: Points are not filtered based on duplicate runs because other pairs may be accumulated
//  in future that break the run of duplicates.
const accumulatePoints = (
  chart: IChartData,
  unfilteredAccPoints: ITimeAndValuePair[],
  pointsChunk: Iterable<IDatapointJSON<number>>
): IFilteredAccPointsResult => {
  for (const point of pointsChunk) {
    if (Array.isArray(point.value) && point.value.length && typeof point.value[0].value === 'number') {
      const timeValue = point.timeValue;
      const value = point.value[0].value;

      //aggregate min, max values
      if (!chart.minValue || value < chart.minValue) { chart.minValue = value; }
      if (!chart.maxValue || value > chart.maxValue) { chart.maxValue = value; }

      const pair: ITimeAndValuePair = [moment.utc(timeValue).local().toDate(), value];
      const insertIndex = sortedIndex(unfilteredAccPoints, pair, compareTimeAndValuePairs);
      const initialLength = unfilteredAccPoints.length;
      if (
        insertIndex >= 0 &&
        insertIndex < initialLength
      ) {
        //Test if pair is new timeValue
        const test = +compareTimeAndValuePairs(pair, unfilteredAccPoints[insertIndex]);
        //* `test === 0` is not a valid test because compare could be NaN
        if (!(test > 0 || test < 0)) {
          //An entry for this timeValue already exists. Replace its value
          unfilteredAccPoints[insertIndex][1] = value;
          continue;
        }
      }
      //splice or push new item
      if (insertIndex === initialLength) {
        unfilteredAccPoints.push(pair);
      } else {
        unfilteredAccPoints.splice(insertIndex, 0, pair);
      }
    }
  }
  return filterAccPoints(unfilteredAccPoints);
};

interface IOptiSite {
  name: string; //site name (the group by key from datastreams.
  charts: IChartData[]; //Note: charts.length is equal to availableKPIs
  location: GeoJSON.Point; //centroid of datastreams locations
  installedOn: string; //ISO8601 string (earliest validFrom of datastreams)
  availableKPIs: number; //equal to this.charts.length
}

interface IOptiSiteConstructionData {
  availableKPIs: number;
  lngSum: number,
  latSum: number,
  installedOn: string;
  charts: IChartData[]
}

interface IInfoPopupDomData {
  root: HTMLDivElement | null;
  intro?: {el: HTMLDivElement, dispose: () => void, disposeToggleSizeHint?: () => void};
  dispose: () => void;
  isPlaced: boolean;
  wasPlacedAndNotPlaced: boolean;

  chartLoadingStates: IInfoPopupLoadingState[];
}

interface IDygraphData {
  d?: Dygraph,
  updateDygraph?: (pts: ITimeAndValuePair[]) => void,
  loadingNoticeEl?: HTMLElement;
  dispose: () => void
}

/*eslint-disable @typescript-eslint/no-this-alias*/
/*eslint-disable prefer-rest-params*/
/*eslint-disable @typescript-eslint/unbound-method*/

@declare(BaseWidget)
class Widget implements IWidget {
  public baseClass: string = 'OptiSites';
  public config: IConfig;
  public started: boolean;
  public state: string;
  public windowState: string;

  public setWindowState: (state: string) => void;
  public setState: (state: string) => void;

  private map: EsriMap;

  private layerStructure: EsriLayerStructureInstance = (EsriLayerStructure as IEsriLayerStructure).getInstance();
  private esriWidgetManager: EsriWidgetManagerInstance = (EsriWidgetManager as IEsriWidgetManager).getInstance();

  private optiSitesLayer: EsriFeatureLayer;

  //@ts-ignore: optiSitesLayerNode is the node in layerStructure for optiSitesLayer (not used at this time)
  private optiSitesLayerNode: EsriLayerNode;

  // siteDataByName is used to lookup optiSite Data by its name when it is clicked. The point (Graphic) contains
  // the name in its attributes
  // * Note: Initially there is one Graphic per site. But the Attribute Table can add a new Graphic when a feature is
  //   selected.  So there could be > 1 Graphic per site.  We look up the siteData by the name because the 1 or
  //   more Graphic per site will have the same attributes
  // * when the EsriGraphic is clicked on, the datapoints are fetched
  private siteDataByName = new Map<string, IOptiSite>();
  private infoTemplateDomDataByName = new Map<string, IInfoPopupDomData>();
  private dygraphByParentEl = new WeakMap<HTMLElement, IDygraphData>();

  // constructor() {
  // }

  private postCreate(/*args: any*/): void {
    const self: any = this;
    self.inherited(Widget.prototype.postCreate, arguments);

    this.createOptiSitesLayer(); //kicks off async work
  }

  private startup(): void {
    let self: any = this;
    self.inherited(Widget.prototype.startup, arguments);
  }

  private async createOptiSitesLayer(): Promise<EsriFeatureLayer> {
    if (!this.optiSitesLayer) {

      const marker = new EsriPictureMarkerSymbol(optiIconRelURL, 45 / 2, 37 / 2);
      const renderer = new EsriSimpleRenderer(marker)
      renderer.label = 'Opti Site';

      //layerDefinition interface is not clear
      //* Can be inspected by looking at other feature Layers added to the layerStructure:
      //* layerStructure.getLayerNodes()[1]._layerInfo.layerObject.toJson().layerDefinition
      const layerDefinition = {
        // Note: advancedQueryCapabilities can be set here, but it has no effect
        // advancedQueryCapabilities: {
        //   supportsOrderBy : true,
        //   supportsDistinct : true
        // },
        geometryType: 'esriGeometryPoint',
        description: 'Sites managed by OptiRTC Inc (www.optirtc.com)',
        htmlPopupType: EsriFeatureLayer.POPUP_HTML_TEXT,
        mode: EsriFeatureLayer.MODE_ONDEMAND,
        objectIdField: 'name',
        displayField: 'name',
        type: 'Feature Layer',
        // uniqueIdField: { isSystemMaintained: true, name: 'name' }, //inspected other feature layers
        fields: [
          //type: https://developers.arcgis.com/javascript/3/jsapi/field-amd.html#type
          { name: 'name', type: 'esriFieldTypeOID', alias: 'Opti Site Name' },
          { name: 'availableKPIs', type: 'esriFieldTypeInteger', alias: 'Available KPIs' },
          { name: 'installedOn', type: 'esriFieldTypeDate', alias: 'Installed On (UTC ISO 8601)' },
          { name: 'installedOnLocal', type: 'esriFieldTypeString', alias: 'Installed On (local)' }
        ] as EsriField[]
        // drawingInfo: {
        // }
      };

      //infoTemplate references:
      //* https://developers.arcgis.com/javascript/3/jsapi/infotemplate-amd.html
      //* https://developers.arcgis.com/javascript/3/jsapi/infowindow-amd.html (driven by EsriInfoTemplate)
      //* https://developers.arcgis.com/javascript/3/jshelp/intro_infowindow.html
      //* https://developers.arcgis.com/javascript/3/jshelp/intro_popuptemplate.html
      //* https://developers.arcgis.com/javascript/3/jshelp/intro_formatinfowindow.html
      //  * Note: the content argument can be a function that receives the graphic clicked on
      //    as its argument and can return either:
      //    * string
      //    * reference to HTML element (our choice)
      //    * deferred
      //* https://developers.arcgis.com/javascript/3/jssamples/fl_popup.html
      //* The infoTemplate is rendered into `this.map.infoWindow.domNode`
      //* We can listen to open/close of the infoWindow with
      //  * this.map.infoWindow.on('show', (evt: {target: InfoWindowBase}) => { ... });
      //  * this.map.infoWindow.on('hide', (evt: {target: InfoWindowBase}) => { ... });
      const infoTemplate = new EsriInfoTemplate(
        '${name}',
        (_pointGraphic: EsriGraphic) => this.getInfoTemplateContent(_pointGraphic)
      );

      //https://developers.arcgis.com/javascript/3/jsapi/featurelayer-amd.html
      this.optiSitesLayer = new EsriFeatureLayer(
        { layerDefinition, featureSet: null } as EsriFeatureCollectionObject,
        {
          id: 'OptiSites',
          className: 'OptiSitesLayer', //css class
          visible: !!this.config.optiSitesLayerVisibleOnStart,
          showLabels: true,
          showAttribution: true,
          // mode: EsriFeatureLayer.MODE_SNAPSHOT,
          outFields: ['*'],
          infoTemplate
        }
      );
      this.optiSitesLayer.name = 'Opti Sites';
      this.optiSitesLayer.attributionDataUrl = 'https://www.optirtc.com';
      this.optiSitesLayer.renderer = renderer;

      const sites = await this.createSiteData();
      if (sites && sites.length) {
        const inSR = new EsriSpatialReference(4326);
        for (const site of sites) {
          const {name, installedOn, availableKPIs} = site;
          //Note: point geometry must be encoded with WebMercator Spatial Reference for
          //filter by map extent to work in attribute table
          const point = webMercatorUtils.geographicToWebMercator(new EsriPoint(site.location.coordinates, inSR));
          const pointGraphic = new EsriGraphic(
            //geometry:
            point,
            //symbol
            marker,
            //attributes
            {name, installedOn, installedOnLocal: formatTimeValue(installedOn), availableKPIs}//,
            // infoTemplate
          );
          this.siteDataByName.set(name, site);
          this.optiSitesLayer.add(pointGraphic);
        }
      }

      this.map.addLayer(this.optiSitesLayer);

      //Note: It takes a moment for this.optiSitesLayer to be added to this.layerStructure
      this.optiSitesLayerNode = await waitForLayerToBeAdded(this.layerStructure, this.optiSitesLayer);

      if (this.config.zoomToFitOptiSites) {
        this.zoomToFitOptiSites();
      }
    }

    //Once opened, close it. It does not need to be opened again.
    this.esriWidgetManager.closeWidget(this);

    return this.optiSitesLayer;
  }

  //createSiteData(): creates the IOptiSite[] data associated with each point graphic in this.optiSitesLayer
  //* later it this IOptiSite data is updated when the point graphic is clicked on by this.updateSiteData()
  private async createSiteData(): Promise<IOptiSite[]> {
    const siteDataBySiteName = new Map<string, IOptiSiteConstructionData>();

    const optiAPIKey = this.config.optiAPIKey;
    //About groupKeyPattern
    //* First group is siteName
    //* Second group is titleAndProduct
    //* Third group is product
    //* Forth group is title
    const groupKeyPattern = /^(.*)-((.*):(.*))$/;

    //Collect siteName and siteData by grouping datastreams by their site name
    //* Described in https://docs.google.com/document/d/11BfgvdPrTr5jZgd2Qxui9PUhYR6jqynr8Mc5fKclNKs/edit#
    for await (const d of getDatastreams(optiAPIKey)) {
      if (d && d.title && d.location && Array.isArray(d.location.coordinates)) {
        groupKeyPattern.lastIndex = 0;
        const siteNameTitleAndProductMatches = groupKeyPattern.exec(d.title);
        if (siteNameTitleAndProductMatches) {
          let [, siteName, , product, title] = siteNameTitleAndProductMatches;
          const dataStreamId = d.id;
          const unit = d.unitAbbreviation;
          if (typeof siteName === 'string') { siteName = siteName.trim(); }
          if (typeof product === 'string') { product = product.trim(); }
          if (typeof title === 'string') { title = title.trim(); }
          let siteData = siteDataBySiteName.get(siteName);
          if (!siteData) {
            //initialize and index siteData
            siteData = {
              availableKPIs: 0,
              lngSum: 0,
              latSum: 0,
              installedOn: '',
              charts: []
            } as IOptiSiteConstructionData;
            siteDataBySiteName.set(siteName, siteData);
          }
          //Accumulate long and lat to calculate centroid
          const [lng, lat] = d.location.coordinates;
          siteData.lngSum += lng;
          siteData.latSum += lat;
          //Accumulate the min validFrom as the installedOn value
          if (!siteData.installedOn || (typeof d.validFrom === 'string' && d.validFrom < siteData.installedOn)) {
            siteData.installedOn = d.validFrom;
          }
          //accumulate availableKPIs
          siteData.availableKPIs++;

          //accumulate charts
          siteData.charts.push(this.chartDataFactory(dataStreamId, title, product, unit));
        }
      }
    }

    const sites = Array.from(siteDataBySiteName.entries())
      .map<IOptiSite>(([
        name,
        {
          installedOn,
          lngSum,
          latSum,
          availableKPIs,
          charts
        }
      ]) => {
        //longitude and latitude are computed as centroid of site's datastream's long/lat
        return {
          name,
          installedOn,
          //location is calculated as the centroid of the accumulated datastream's locations
          location: {
            type: 'Point',
            coordinates: [(lngSum / availableKPIs), (latSum / availableKPIs)]
            //Note: I considered calculating the bbox using the min and max of the lng/lat pairs,
            //but careful consideration of meridan is required to find sw and ne corners.
            //* using https://terraformer-js.github.io/ is probably best.
            //* fortunately we don't need the bbox today. new EsriPoint() only considers coordinates
          },
          availableKPIs,
          charts
        };
      });

    siteDataBySiteName.clear(); //done with siteDataBySiteName
    return sites;
  }


  //getInfoTemplateContent():
  //* get/create the root element for the intoTemplate's content
  //  * reuses cached value if it exists already
  //  * if created, it kicks off async work to load chart data (the points)
  //* Notes:
  //  * It seems that the root element is never destroyed by the AppBuilder web app, so
  //    the mechanism to stop async loading of chart points does not stop AND the cleanup()
  //    fn is never called
  //  * This is not serious... but could lead to memory growth. (not exactly a leak...)
  //  * It is added to this.map.infoWindow.domNode... so it may be worth listening to infoWindow's hide event
  //    to do cleanup.
  private getInfoTemplateContent(
    pointGraphic: EsriGraphic
  ): HTMLDivElement | string {
    const name = pointGraphic?.attributes.name;
    const siteData = this.siteDataByName.get(name);
    let domData: IInfoPopupDomData | undefined = this.infoTemplateDomDataByName.get(name);

    if (siteData) {
      if (domData && domData.root) {
        // console.log(this.dygraphByParentEl); //will have entries
        //Update each chart's loading state: We are going to reload
        domData.chartLoadingStates.forEach(state => {
          state.loaded = false;
          state.loadingId++;
          if (state.disposeDygraph) {
            state.disposeDygraph();
            delete state.disposeDygraph;
          }
        });
        //Clear the root element
        domConstruct.empty(domData.root);
        // console.log(this.dygraphByParentEl); //no entries after domData.root is destroyed
      } else {
        let wasPlaced = false; //private to domData

        const disposers: (() => void)[] = [
          //Create handlers for hide and selection-change and capture their remove() methods
          (this.map.infoWindow as EsriPopup).on(
            'hide',
            (/*evt: { target: EsriPopup }*/) => {
              if (domData) {
                domData.dispose();
              }
            }
          ).remove,
          (this.map.infoWindow as EsriPopup).on(
            'selection-change',
            (evt: { target: EsriPopup }) => {
              if (domData) {
                const newName = Array.isArray(evt?.target.features) &&
                  evt.target.features[0] &&
                  evt.target.features[0].attributes.name;
                //Test if selection really changed. It could be a change in the pointGraphic selection
                //but not a change in the name
                if (name !== newName) {
                  domData.dispose();
                }
              }
            }
          ).remove,
          //Final dispose work
          () => {
            if (domData) {
              // console.log('dispose dom data');
              if (domData.root) {
                domConstruct.empty(domData.root);
                domConstruct.destroy(domData.root);
                domData.root = null;
              }
              if (domData.intro) {
                domData.intro.dispose();
              }
              domData.dispose = noop; //dispose is called only once
              domData.chartLoadingStates.forEach(state => {
                //Update each chart's loadingId so if there is a pending loadChartPoints, it stops
                state.loadingId++;
                if (state.disposeDygraph) {
                  state.disposeDygraph();
                  delete state.disposeDygraph;
                }
              });

              domData = undefined;
              this.infoTemplateDomDataByName.delete(name);
            }
          }
        ];

        domData = {
          root: domConstruct.create(divTag, optiSiteDataHTMLAttributes),
          chartLoadingStates: siteData.charts.map<IInfoPopupLoadingState>(() => ({
            loaded: false,
            loadingId: 0,
            get shouldStopLoading(): boolean {
              return !domData || domData.wasPlacedAndNotPlaced
            }
          })),
          get isPlaced(): boolean {
            if (domData) {
              const result = !!(domData.root && domData.root.parentElement);
              if (result) { wasPlaced = true; }
              return result;
            }
            return false;
          },
          get wasPlacedAndNotPlaced(): boolean {
            return (domData && !domData.isPlaced && wasPlaced) || false;
          },
          dispose: () => {
            disposers.forEach(d => d());
            disposers.length = 0;
          }
        };

        this.infoTemplateDomDataByName.set(name, domData);
      }

      const root = domData.root as HTMLDivElement;

      this.createOrUpdateIntro(domData);

      const chartsEl = domConstruct.place(chartsHTML, root) as HTMLDivElement;

      const chartLoadingStates = domData.chartLoadingStates;
      //Initiate parallel work to load each chart's points async
      //* The promise returned the forEach() call back is not used.
      //* We need callback because in ES5 `const chartLoadingState` and others are
      //  not bound locally to `for` block.  By being a fn, these const/let are bound to fn.
      //eslint-disable-next-line @typescript-eslint/no-misused-promises
      siteData.charts.forEach(async (chart, i) => {
        const {title, unit, asyncPointsUpdates} = chart;
        const chartLoadingState = chartLoadingStates[i];
        const chartDiv = domConstruct.place(chartHTML, chartsEl) as HTMLDivElement;
        domConstruct.place(chartTitleHTML(title, unit), chartDiv);
        const dygraphLegend = domConstruct.place(dygraphLegendHTML, chartDiv) as HTMLDivElement;
        const dygraphContainer = domConstruct.place(dygraphContainerHTML, chartDiv) as HTMLDivElement;
        chartLoadingState.disposeDygraph = () => this.disposeDigraphForEl(dygraphContainer);
        this.createOrUpdateDygraph(dygraphContainer, dygraphLegend, chart, [], true);

        let accPoints: Iterable<ITimeAndValuePair> = [];
        const thisLoadId = chartLoadingState.loadingId;
        // console.log(`start loading: ${title}, dataStreamId: ${dataStreamId}, loadId: ${thisLoadId}`);
        try {
          for await (const updatedAccPoints of asyncPointsUpdates) {
            if (thisLoadId !== chartLoadingState.loadingId || chartLoadingState.shouldStopLoading) {
              //The chart data is no longer needed.
              //* Perhaps the info popup window was closed and reopened
              //  * if reopened, the data is reloaded because it may have changed
              //* Perhaps the root DOM element (that dygraphContainer is a decendent of) was removed
              // console.log(`abort loading: ${title}, dataStreamId: ${dataStreamId}, loadId: ${thisLoadId}`);
              this.disposeDigraphForEl(dygraphContainer);
              domConstruct.destroy(chartDiv);
              return;
            }
            accPoints = updatedAccPoints;
            this.createOrUpdateDygraph(dygraphContainer, dygraphLegend, chart, Array.from(accPoints), true);
          }
          //done loading
          if (thisLoadId === chartLoadingState.loadingId) {
            this.createOrUpdateDygraph(dygraphContainer, dygraphLegend, chart, Array.from(accPoints), false);
            // console.log(`done loading: ${title}, dataStreamId: ${dataStreamId}, loadId: ${thisLoadId}`);
          } else {
            this.disposeDigraphForEl(dygraphContainer);
            domConstruct.destroy(chartDiv);
          }
        } catch {
          if (thisLoadId === chartLoadingState.loadingId) {
            this.createOrUpdateDygraph(dygraphContainer, dygraphLegend, chart, Array.from(accPoints), false);
          } else {
            this.disposeDigraphForEl(dygraphContainer);
            domConstruct.destroy(chartDiv);
          }
        }
        //To Consider: Setup work to update the chartpoints in future after 3min...
        //* Today user has to close and reopen to see new data (if it has been > 3 min)
      });
      return root;
    }
    if (domData) {
      //unlikely it is defined if siteData is undefined (but delete if it is)
      domData.dispose();
    }
    return 'Unknown site'; //unexpected
  }

  private createOrUpdateDygraph(
    dygraphContainer: HTMLElement, //dygraphContainer (.dygraph-container)
    dygraphLegend: HTMLElement,
    chart: IChartData,
    pts: ITimeAndValuePair[],
    isLoading: boolean
  ): void {
    let data = this.dygraphByParentEl.get(dygraphContainer);
    if (isLoading) {
      if (!data) {
        //Instantiate data with a loading notice
        data = {
          dispose: () => {
            if (data && data.loadingNoticeEl) {
              domConstruct.destroy(data.loadingNoticeEl);
              delete data.loadingNoticeEl;
            }
          },
          loadingNoticeEl: domConstruct.place(loadingHTML, dygraphContainer)
        };
        this.dygraphByParentEl.set(dygraphContainer, data);
      }
      if (pts.length > 1) {
        //Create or update the dygraph
        if (!data.d) {
          //create the dygraph

          //Dygraph Options:
          //* See http://dygraphs.com/options.html
          const initiallyMaximized: boolean = this.isInfoWindowMaximized();
          const yAxisOptions: dygraphs.PerAxisOptions = { axisLabelWidth: initiallyMaximized ? 50 : 0 };
          const options: dygraphs.Options = {
            labelsDiv: dygraphLegend,
            axes: { y: yAxisOptions },
            ...this.getDygraphWidthAndHeight(initiallyMaximized),
            // xlabel: '',
            // ylabel: chart.title,

            //legend options: http://dygraphs.com/options.html#Legend
            hideOverlayOnMouseOut: false,
            labelsSeparateLines: true,
            labels: ['', chart.title], //(legend labels)
            legend: initiallyMaximized ? 'always' : 'never',
            legendFormatter: (legendData: dygraphs.LegendData): string => {
              if (legendData.x == null) {
                  // This happens when there's no selection and {legend: 'always'} is set.
                  return `<br>${
                    legendData.series.map(series => `${series.dashHTML} ${series.labelHTML}`
                    ).join('<br>')}`;
              }

              let html = legendData.xHTML;
              legendData.series.forEach(series => {
                if (!series.isVisible) return;
                var labeledData = `${series.labelHTML}: ${series.yHTML}`;
                if (series.isHighlighted) { labeledData = `<b>${labeledData}</b>`; }
                html += `<br>${series.dashHTML} ${labeledData} ${
                  (chart.unit && chart.unit !== 'state') ? `<i> ${chart.unit}</i>` : ''
                }`;
              })
              return html;
            }
          };

          const onMaximize = (/*evt: {target: EsriInfoWindow}*/) => {
            const d = data && data.d;
            if (d) {
              Object.assign(options, {legend: 'always', ...this.getDygraphWidthAndHeight(true)});
              Object.assign(yAxisOptions, { axisLabelWidth: 50 });
              d.updateOptions(options);
              if (options.width && options.height) {
                d.resize(options.width, options.height);
              }
            }
          };
          const onRestore = (/*evt: {target: EsriInfoWindow}*/) => {
            const d = data && data.d;
            if (d) {
              Object.assign(options, {legend: 'never', ...this.getDygraphWidthAndHeight(false)});
              Object.assign(yAxisOptions, { axisLabelWidth: 0 });
              d.updateOptions(options);
              if (options.width && options.height) {
                d.resize(options.width, options.height);
              }
            }
          };

          const disposers: (() => void)[] = [
            data.dispose, //previous dispose
            this.map.infoWindow.on('maximize', onMaximize).remove,
            this.map.infoWindow.on('restore', onRestore).remove,
            //Final dispose work
            () => {
              if (data) {
                if (data.d) { data.d.destroy(); }
                domConstruct.destroy(dygraphLegend);
                domConstruct.destroy(dygraphContainer);
                delete data.d;
                delete data.updateDygraph;
                data.dispose = noop;
              }
              if (options) {
                Object.keys(options).forEach(k => {
                  if (Object.prototype.hasOwnProperty.call(options, k)) {
                    delete options[k as keyof dygraphs.Options];
                  }
                });
              }
              disposers.length = 0;
              this.dygraphByParentEl.delete(dygraphContainer);
            }
          ];

          Object.assign(data, {
            d: new (Dygraph as DygraphConstructor)(dygraphContainer, pts, options),
            updateDygraph: (file: ITimeAndValuePair[]) => {
              const d = data && data.d;
              if (d && options) {
                const {width, height} = this.getDygraphWidthAndHeight();
                Object.assign(options, {file, ...{width, height}});
                d.updateOptions(options);
                if (options.width && options.height) {
                  d.resize(options.width, options.height);
                }
              }
            },
            dispose: () => disposers.forEach(d => d())
          });
        } else if (data.updateDygraph) {
          data.updateDygraph(pts);
        }
      }
    } else {
      if (data && data.loadingNoticeEl) {
        //remove because we aren't loading anymore
        domConstruct.destroy(data.loadingNoticeEl);
      }
      if (!pts.length) {
        domConstruct.place(noPointsHTML, dygraphContainer);
      }
    }
  }

  //@ts-ignore not used yet
  private disposeDigraphForEl(dygraphContainer: HTMLElement) {
    let {dispose} = this.dygraphByParentEl.get(dygraphContainer) || {};
    if (dispose) {
      // console.log('dispose dygraph');
      dispose();
      this.dygraphByParentEl.delete(dygraphContainer);
    }
  }

  // @ts-ignore (not used yet)
  private clearFeatureLayer() {
    if (this.optiSitesLayer) {
      this.optiSitesLayer.clear();
    }
  }

  // @ts-ignore (not used yet)
  private zoomToFitOptiSites() {
    if (this.optiSitesLayer) {
      var extent = esriGraphicsUtils.graphicsExtent(this.optiSitesLayer.graphics);
      if (extent) {
        this.map.setExtent(extent, true);
      } else {
        if (
          Array.isArray(this.optiSitesLayer.graphics) &&
          this.optiSitesLayer.graphics &&
          this.optiSitesLayer.graphics.length &&
          this.optiSitesLayer.graphics[0].geometry
        ) {
          this.map.centerAndZoom(
            this.optiSitesLayer.graphics[0].geometry as EsriPoint,
            8); //bigger number is zoomed in more
        }
      }
    }
  }

  private chartDataFactory(
    dataStreamId: number,
    title: string,
    product?: string,
    unit?: string
  ): IChartData {
    const chart: Omit<IChartData, 'asyncPointsUpdates'> = {dataStreamId, title};
    if (product) { chart.product = product; }
    if (unit) { chart.unit = unit; }
    (chart as IChartData).asyncPointsUpdates = this.asyncPointsUpdatesFactory(chart as IChartData);
    return chart as IChartData;
  }

  private asyncPointsUpdatesFactory(chart: IChartData): AsyncIterable<Iterable<ITimeAndValuePair>> {
    const optiAPIKey = this.config.optiAPIKey;
    const dataStreamId = chart.dataStreamId;

    //unfilteredAccPoints: maintains a sorted list of the ITimeAndValuePair accumulated from the chunks
    //of points that arrived from getDatapointChunks.
    const unfilteredAccPoints: ITimeAndValuePair[] = [];

    //filteredAccPoints:
    //* An iterable that yields filtered unfilteredAccPoints until a new chunk of
    //  points arrives (in which case its stops iterating because a new filteredAccPoints will be yielded
    //  by the asyncIterator)
    //* Note: We need to track unfilteredAccPoints separately because new datapoints may arrive in unsorted
    //  order and may cause a previously filtered datapoint to be no longer filtered.
    let filteredAccPoints: Iterable<ITimeAndValuePair>;

    //hs and callHandlers is used for a simple pub/sub pattern used for asyncIterator when
    //fetching is in progress or last requested datapoints is stale
    const hs = new Set<INewPointsHandler>();
    const callHandlers = (stoppedIterationEarly: boolean = false) => {
      if (filteredAccPoints) {
        hs.forEach(h => { try { h(filteredAccPoints || [], stoppedIterationEarly); } catch { /*noop*/ } });
      }
    };

    //IMPORTANT:
    //* isFetching, lastDatapointsRequest, and lastCompletedRequest are state related to
    //  the `asyncPointsUpdates: AsyncIterable` created by this factory and is private.
    //* These states should not be confused with `state: IInfoPopupLoadingState` used by
    //  this.loadChartPoints (IInfoPopupLoadingState is associated with the info pop up's view)
    let lastDatapointsRequest: moment.Moment | null;
    let lastCompletedRequest: moment.Moment | null;
    let isFetching: boolean = false;

    const asyncPointsUpdates: AsyncIterable<Iterable<ITimeAndValuePair>> = {
      //This points AsyncIterable: maps IDatapointJSON<T> to ITimeAndValuePair
      async *[Symbol.asyncIterator]() {
        const now = moment.utc();
        if (
          !isFetching && (
            //This is first request
            !lastDatapointsRequest ||
            //or upstream asyncIterator stopped iteration before all chunks arrived
            lastCompletedRequest !== lastDatapointsRequest ||
            //or last completed request is stale
            now.diff(lastCompletedRequest, 'm') > 3)
        ) {
          //Then: fetching is not in progress OR the last request is stale
          isFetching = true;
          lastDatapointsRequest = now;
          //reset minValue, maxValue, startFormatted, endFormatted, unfilteredAccPoints, filteredAccPoints
          delete chart.minValue;
          delete chart.maxValue;
          chart.startFormatted = now.clone().local().format(OptiDateTimeFormatWithSeconds)
          chart.endFormatted = now.clone().local().subtract(tss, 's').format(OptiDateTimeFormatWithSeconds)
          unfilteredAccPoints.length = 0; //reset
          filteredAccPoints = []; //reset
          const utcModern = now.toISOString();
          let stopAllIteration: () => void = noop;
          try {
            for await (const pointsChunk of getDatapointChunks<number>(optiAPIKey, {dataStreamId, utcModern, tss})) {
              //If there is a previous filteredAccPoints, it will be replaced,
              //so stop all iteration of iterators created by previous filteredAccPoints
              stopAllIteration();
              (
                {stopAllIteration, filteredAccPoints} =
                  accumulatePoints(chart, unfilteredAccPoints, pointsChunk)
              );
              yield filteredAccPoints;
              callHandlers();
            }
            lastCompletedRequest = lastDatapointsRequest; //done: upstream iterator did not stop iterating early
          } finally {
            //In case there are pending handlers
            //* Usually there will be none, but there is an edge case
            //  where a new asyncIterator MAY have be requested while waiting for
            //  next pointsChunk that may not arrive (ie we are done and don't know it yet)
            callHandlers(lastCompletedRequest !== lastDatapointsRequest);
            //stopAllIteration should not be called again, but replaced with noop for safety
            //* do not call stopAllIteration() because the filteredAccPoints is its final value
            stopAllIteration = noop;
            isFetching = false;
          }
        } else {
          //Otherwise reuse existing points and yield updates to filteredAccPoints as
          //new chunks of points arrive
          yield filteredAccPoints || [];
          let stoppedIterationEarly = false;
          while (isFetching) {
            //add handler and wait for it to be called with next updated filteredAccPoints
            yield await new Promise<Iterable<ITimeAndValuePair>>(r => {
              const h: INewPointsHandler = (_filteredAccPoints, _stoppedIterationEarly) => (
                r(_filteredAccPoints),
                hs.delete(h),
                stoppedIterationEarly = _stoppedIterationEarly
              );
              hs.add(h);
            });
          }
          if (stoppedIterationEarly) {
            //* Must start over because this asyncIterator is replying on a previous asyncIterator
            //  instance's completion. But the pervious asyncIterator stopped iterating
            //* Note: this asyncIterator instance can still stop iterating.  The next yield* will only
            //  iterate if it is asked to iterate
            yield* asyncPointsUpdates;
          }
        }
      }
    };
    return asyncPointsUpdates;
  }

  // @ts-ignore: it is called when the widget opens
  private onOpen(): void {
    //Close it...
    //* This widget simply creates a layer. Once opened, it does not need to be opened again
    //* this.optiSitesLayerNode means the layer is fully loaded
    if (this.optiSitesLayerNode) {
      this.esriWidgetManager.closeWidget(this);
    }
  }


  private getDygraphWidthAndHeight(
    isMaximized: boolean = this.isInfoWindowMaximized()
  ): {width?: number, height?: number} {
    const contentNode = this.getInfoWindowContentNode();
    if (contentNode) {
      const {clientWidth, clientHeight/*, offsetWidth, offsetHeight*/} = contentNode;
      // Note:
      // * The vertical scroll bar's width is different on v2.5 of WAB and v2.16 of WAB
      // * It is 6px on v2.16 and 27px on v2.5
      // const scrollBarWidth = offsetWidth - clientWidth;
      // const scrollBarHeight = offsetHeight - clientHeight;
      return {
        //* see CSS; The container has 10px padding on left
        //  * I reduce by 20px so the graph is centered. (10px on left and 10px on right)
        //  * When maximized the left axis is another 50px (but this is not used in width calc)
        //* height:
        //  * 50px when not maximized or clientHeight is < 141px
        //  * 125 = 50 / 0.4
        //  * when maximized, we'll use 0.4 of height
        width: isMaximized ? (clientWidth - 20 /*10 + 10*/) : (clientWidth - 20 /*10 + 10*/),
        height: isMaximized ?
          (clientHeight < 125 ? 50 : Math.round(clientHeight * 0.4)) :
          50
      };
    } else {
      return {};
    }
  }

  private isInfoWindowMaximized(): boolean {
    if (this.map && this.map.infoWindow) {
      if (
        Object.prototype.hasOwnProperty.call(this.map.infoWindow, '_maximized') &&
        typeof (this.map.infoWindow as any)._maxmized === 'boolean' //sometimes undefined
      ) {
        return (this.map.infoWindow as any)._maxmized === true;
      }
      const domNode: HTMLElement = this.map.infoWindow.domNode;
      if (domNode && domNode.classList.contains('esriPopupVisible')) {
        return domNode.classList.contains('esriPopupMaximized');
      } else {
        return false;
      }
    }
    return false;
  }

  private getInfoWindowContentNode() {
    const domNode: HTMLElement = this.map.infoWindow.domNode;
    if (domNode && domNode.classList.contains('esriPopupVisible')) {
      return domNode.querySelector('.contentPane') as HTMLElement;
    }
  }

  private createOrUpdateIntro(domData: IInfoPopupDomData) {
    if (domData.root) {
      const intro = domData.intro;
      const {el} = intro || { el: domConstruct.place(introHTML, domData.root) as HTMLDivElement };
      if (intro) {
        //* Clear the infoBody (all children of el but title)
        //* new introTextHTML will be appended
        if (intro.disposeToggleSizeHint) { intro.disposeToggleSizeHint(); }
        const [, ...tailChildren] = el.children;
        tailChildren.forEach(c => c.remove());
      } else {
        //Create the title, and handlers for updating the intro when maximized/restored, and disposers

        domConstruct.place(introTitleHTML, el); //title

        const onMaximizeOrRestore = this.createOrUpdateIntro.bind(this, domData);
        const disposers = [
          this.map.infoWindow.on('maximize', onMaximizeOrRestore).remove,
          this.map.infoWindow.on('restore', onMaximizeOrRestore).remove
        ];
        const dispose = () => {
          if (domData.intro) {
            domConstruct.destroy(domData.intro.el);
            disposers.forEach(d => d());
            disposers.length = 0;
            delete domData.intro;
          }
        }
        domData.intro = { el, dispose };
      }
      const p = domConstruct.place(
        `<p>${introTextHTML} ${this.isInfoWindowMaximized() ? restoreViewHTML : maximizeViewHTML}</p>`,
        el
      ) as HTMLParagraphElement;
      const as = p.getElementsByTagName('a');
      const a = as[as.length - 1];
      const removeClickHandler = addElementEventListener({
          t: 'click',
          e: a,
          h: (/*event*/) => {
            if (this.map.infoWindow) {
              if (this.isInfoWindowMaximized()) {
                if (typeof (this.map.infoWindow as EsriPopup).restore === 'function') {
                    (this.map.infoWindow as EsriPopup).restore();
                }
              } else if (typeof (this.map.infoWindow as EsriPopup).maximize === 'function') {
                  (this.map.infoWindow as EsriPopup).maximize();
              }
            }
          }
      });
      if (domData.intro) {
        domData.intro.disposeToggleSizeHint = () => {
          removeClickHandler();
          a.remove();
          p.remove();
        };
      }
    }
  }

}

export = Widget;
