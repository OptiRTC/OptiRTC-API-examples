import EsriMap from 'esri/map';
import EsriPoint from 'esri/geometry/Point';
import EsriExtent from 'esri/geometry/Extent';
import EsriLOD from 'esri/layers/LOD';
import EsriLayer from 'esri/layers/layer';

export type DojoDeferred<T> = dojo.Deferred & { promise: dojo.promise.Promise<T> }

//developers.arcgis.com/javascript/3/jsapi/map-amd.html
export interface IExtentChange {
  delta: EsriPoint;
  extent: EsriExtent;
  levelChange: boolean;
  lod: EsriLOD;
}

// https://developers.arcgis.com/web-appbuilder/api-reference/layerstructure.htm
export interface IEsriLayerStructure {
  STRUCTURE_CHANGE_ADD: string;
  STRUCTURE_CHANGE_REMOVE: string;
  STRUCTURE_CHANGE_SUBNODE_ADD: string;
  STRUCTURE_CHANGE_SUBNODE_REMOVE: string;
  STRUCTURE_CHANGE_NODE_UPDATE: string;
  STRUCTURE_CHANGE_REORDER: string;
  EVENT_STRUCTURE_CHANGE: string;
  EVENT_TOGGLE_CHANGE: string;
  EVENT_VISIBILITY_CHANGE: string;
  EVENT_FILTER_CHANGE: string;
  EVENT_RENDERER_CHANGE: string;
  EVENT_OPACITY_CHANGE: string;

  getInstance(): EsriLayerStructureInstance;
}

//https://developers.arcgis.com/javascript/3/jsapi/featurelayer-amd.html
export interface EsriFeatureCollectionObject {
  layerDefinition: any;
  featureSet: any; //EsriFeatureSet //https://developers.arcgis.com/javascript/3/jsapi/featureset-amd.html
}

// https://developers.arcgis.com/web-appbuilder/api-reference/layernode.htm
// Vote for https://community.esri.com/ideas/13147-maintain-a-typescript-definition-file-for-jimujs
// * We have to create our own type definitions
export interface EsriLayerNode {
  map: EsriMap;
  title: string;
  id: string;
  subId: string;
  canShowLabel(): boolean;
  disablePopup(): boolean;
  enablePopup(): boolean;
  getExtent(): DojoDeferred<EsriExtent>;
  getFilterFromWebmap(): any; //JSON
  getFilter(): any; //JSON
  getInfoTemplate(): any; //JSON
  getLayerObject<L extends EsriLayer>(): DojoDeferred<L>;
  getLayerType(): DojoDeferred<string>;
  getNodeById(nodeId: string): EsriLayerNode;
  getOpacity(): number; //integer
  getParentNode(): EsriLayerNode;
  getPopupInfo(): any; //JSON
  getPopupInfoFromWebmap(): any; //JSON
  getRelatedNodes(): EsriLayerNode[];
  getRootNode(): EsriLayerNode;
  getServiceDefinition(): any; //JSON or XML
  getSubNodes(): EsriLayerNode[];
  getUrl(): string;
  hide(): void;
  hideLabel(): void;
  isHostedLayer(): DojoDeferred<boolean>;
  isItemLayer(): { portalUrl: string; itemId: string} | null;
  isLabelVisble(): boolean;
  isLeaf(): boolean;
  isPopupEnabled(): boolean;
  isRoot(): boolean;
  isShowLegend(): boolean;
  isShowLegendFromWebmap(): boolean;
  isTable(): boolean;
  isTiled(): boolean;
  isToggledOn(): boolean;
  isVisible(): boolean;
  isVisibleAtMapScale(): boolean;
  loadInfoTemplate(): DojoDeferred<any>; //json
  loadPopupInfo(): DojoDeferred<any>; //json
  setFilter(layerDefinitionExpression: string): void;
  setOpacity(opacity: number): void;
  show(): void;
  showLabel(): void;
  toggle(): void;
  traversal(callback: (layerNode: EsriLayerNode) => boolean): void;
}

//EsriLayerStructureInstance is a singleton and is a kind of service
// https://developers.arcgis.com/web-appbuilder/api-reference/layerstructure.htm
export interface EsriLayerStructureInstance extends dojo.Evented {
  addTable(table: EsriFeatureCollectionObject): EsriLayerNode;
  getBasemapLayerObjects(): EsriLayer[];
  getLayerNodes(): EsriLayerNode[];
  getNodeById(nodeId: string): EsriLayerNode;
  getTableNodes(): EsriLayerNode[];
  getWebmapLayerNodes(): EsriLayerNode[];
  getWebmapTableNodes(): EsriLayerNode[];
  removeTable(nodeId: string): void;
  traversal(callback: (layerNode: EsriLayerNode) => boolean): void;
  traversalWithNodes(callback: (layerNode: EsriLayerNode) => boolean, nodes: EsriLayerNode[]): void;
}

export interface EsriWidgetManagerInstance {
  loadWidget(widgetJson: any): DojoDeferred<void>;
  getWidgetById(widgetId: string): any; //the widget instance
  getWidgetsByName(widgetName: string): any[]; //the widget instances
  getWidgetMarginBox(widget: any): {l: number; t: number; w: number; h: number};
  getWidgetByLabel(widgetLabel: any): any;
  getAllWidgets(): any[]; //all widget instances
  openWidget(widget: any): void; //widgetID or widget instance object
  maximizeWidget(widget: any): void; //widgetID or widget instance object
  minimizeWidget(widget: any): void; //widgetID or widget instance object
  normalizeWidget(widget: any): void; //widgetID or widget instance object
  closeWidget(widget: any): void; //widgetID or widget instance object
  destroyWidget(widget: any): void; //widgetID or widget instance object
  tryLoadWidget(widgetJson: any): DojoDeferred<void>;
  loadWidgetSettingPage(widgetJson: any): DojoDeferred<void>;
}

// https://developers.arcgis.com/web-appbuilder/api-reference/widgetmanager.htm
export interface IEsriWidgetManager extends dojo.Evented {
  getInstance(): EsriWidgetManagerInstance;
}

export interface EsriStructureChangeEvent {
  type: string;
  layerNodes: EsriLayerNode[];
  rootLayerNodes: EsriLayerNode[];
}
