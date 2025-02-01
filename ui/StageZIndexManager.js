class StageZIndexManagerDO extends DataObject {
    constructor() {
        super();
        
        this.objectType = "STAGEZINDEXMANAGER";

        this.maxLayerSize = 100000;
        this.layers = new Array(); 
    }
}

class StageZIndexManager {
    constructor(dataObject) {
        this.dataObject = dataObject;
        dataManager.registerObject(this);

    }

    set(layer, object) {
        if(!this.getLayers()[layer]) this.getLayers()[layer] = new Array();

        let index = this.getLayers()[layer].length;
        let newIndex = ((layer * this.getMaxLayerSize()) + index)
        this.getLayers()[layer].push(object.dataObject.objectId);

        object.setZIndex(newIndex);
    }

    remove(layer, object) {
        let removedIndex = object.getZIndex();
        
        let index = this.getLayers()[layer].indexOf(object.dataObject.objectId);
        this.getLayers()[layer].splice(index, 1);

        for(let i = 0; i < this.getLayers()[layer].length; i++) {
            let obj = dataManager.getObject(this.getLayers()[layer][i]);
            let zIndex = obj.getZIndex();
            if(zIndex > removedIndex)
                obj.setZIndex(zIndex-1);
        }
    }

    getMaxLayerSize() {
        return this.dataObject.maxLayerSize;
    }
    getLayers() {
        return this.dataObject.layers;
    }
}
      