import EsriLayer from 'esri/layers/layer';
//@ts-ignore (LayerStructure exists, but type definition does not)
import EsriLayerStructure from 'jimu/LayerStructure';
import {
  EsriLayerNode,
  EsriLayerStructureInstance,
  EsriStructureChangeEvent
} from '../interfaces/esriInterfaces';

export const waitForLayerToBeAdded = (
  layerStructure: EsriLayerStructureInstance,
  layer: EsriLayer
): Promise<EsriLayerNode> => {
  const nodes = layerStructure.getLayerNodes();
  const predicate = (n: EsriLayerNode) => n && n.id === layer.id;
  let layerNode = Array.isArray(nodes) && nodes.find(predicate);
  return layerNode ?
    Promise.resolve(layerNode) :
    //promise wrapper: resolves when event received about layer being added
    new Promise<EsriLayerNode>(resolve => {
      const {remove} = layerStructure.on(
        EsriLayerStructure.EVENT_STRUCTURE_CHANGE,
        (e: EsriStructureChangeEvent) => {
          if (e.type === 'added') {
            layerNode = Array.isArray(e.layerNodes) && e.layerNodes.find(predicate);
            if (layerNode) {
              resolve(layerNode);
              remove();
            }
          }
        }
      )
    });
};
