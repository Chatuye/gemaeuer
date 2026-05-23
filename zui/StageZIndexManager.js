/**
 * StageZIndexManager — manages z-ordering of objects within a Stage.
 *
 * Objects are organized into layers. Each layer occupies a range of zIndex
 * values: layer N spans [N * maxLayerSize, (N+1) * maxLayerSize - 1].
 * Within a layer, objects are stacked in insertion order.
 *
 * Layer assignments:
 *   0 — World objects (tiles on the board). Default layer.
 *   1 — Hand cards (managed by Hand.addCard).
 *   2 — Deck / persistent UI objects above the board.
 *   3 — Drag layer (object currently being picked up / moved).
 *
 * On pickup, an object is removed from its home layer and placed on layer 3
 * so it renders above everything. On drop, it returns to its home layer.
 */

import { StateObject } from '../core/StateObject.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';



export class StageZIndexManagerState extends StateObject {
    constructor() {
        super();
        
        this.objectType = "STAGEZINDEXMANAGER";

        this.maxLayerSize = 100000;
    }
}

export class StageZIndexManager {
    constructor(state) {
        this.state = state;
        dataManager.registerObject(this);

        this.layers = new Array();
        this.objectLayers = new Map();
    }

    set(object, layer) {
        if (!this.getLayers()[layer]) {
            this.getLayers()[layer] = new Array();
        }

        let index = this.getLayers()[layer].length;
        let newZIndex = (layer * this.getMaxLayerSize()) + index;
        this.getLayers()[layer].push(object);
        this.objectLayers.set(object.state.objectId, layer);

        object.setZIndex(newZIndex);
    }

    remove(object) {
        let objectId = object.state.objectId;
        let layer = this.objectLayers.get(objectId);

        let removedIndex = object.getZIndex();
        let pos = this.getLayers()[layer].indexOf(object);
        this.getLayers()[layer].splice(pos, 1);
        this.objectLayers.delete(objectId);

        for (let i = 0; i < this.getLayers()[layer].length; i++) {
            let obj = this.getLayers()[layer][i];
            let zIndex = obj.getZIndex();
            if (zIndex > removedIndex)
                obj.setZIndex(zIndex - 1);
        }
    }

    getLayer(object) {
        return this.objectLayers.get(object.state.objectId);
    }

    getMaxLayerSize() {
        return this.state.maxLayerSize;
    }
    getLayers() {
        return this.layers;
    }
}

objectRegistry.register("STAGEZINDEXMANAGER", StageZIndexManager);
