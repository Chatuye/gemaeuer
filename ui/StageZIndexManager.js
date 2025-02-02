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

        this.layers = new Array();
        for(let i = 0; i < this.dataObject.layers.length; i++) {
			this.getLayers().push(new Array());
            if(this.dataObject.layers[i]) {
                for(let i2 = 0; i2 < this.dataObject.layers[i].length; i2++) {
                    this.layers[i].push(dataManager.getObject(this.dataObject.layers[i][i2]));
                }
            } else {
                this.dataObject.layers[i] = new Array();
            }
        }
    }

    set(layer, object) {
        if(!this.getLayers()[layer]) {
            this.getLayers()[layer] = new Array();
            this.dataObject.layers[layer] = new Array();
        }

        let index = this.getLayers()[layer].length;
        let newIndex = ((layer * this.getMaxLayerSize()) + index)
        this.getLayers()[layer].push(object);
        this.dataObject.layers[layer].push(object.dataObject.objectId);

        object.setZIndex(newIndex);
    }

    remove(layer, object) {
        let removedIndex = object.getZIndex();
        
        let index = this.getLayers()[layer].indexOf(object);
        this.getLayers()[layer].splice(index, 1);

        index = this.dataObject.layers[layer].indexOf(object.dataObject.objectId);
        this.dataObject.layers[layer].splice(index, 1);

        for(let i = 0; i < this.getLayers()[layer].length; i++) {
            let obj = this.getLayers()[layer][i];
            let zIndex = obj.getZIndex();
            if(zIndex > removedIndex)
                obj.setZIndex(zIndex-1);
        }
    }

    getMaxLayerSize() {
        return this.dataObject.maxLayerSize;
    }
    getLayers() {
        return this.layers;
    }
}
      