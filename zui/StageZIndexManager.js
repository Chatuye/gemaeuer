class StageZIndexManagerDO extends DataObject {
    constructor() {
        super();
        
        this.objectType = "STAGEZINDEXMANAGER";

        this.maxLayerSize = 100000;
    }
}

class StageZIndexManager {
    constructor(dataObject) {
        this.dataObject = dataObject;
        dataManager.registerObject(this);

        this.layers = new Array();
    }

    set(object) {
        let zIndex = object.getZIndex();
        if(zIndex < this.getMaxLayerSize()) {
            let layer = zIndex;
            if(!this.getLayers()[layer]) {
                this.getLayers()[layer] = new Array();
            }

            let index = this.getLayers()[layer].length;
            let newZIndex = (((layer+1) * this.getMaxLayerSize()) + index)
            this.getLayers()[layer].push(object);
    
            object.setZIndex(newZIndex);
        } else {
            let layer = Math.floor(zIndex/this.getMaxLayerSize())-1;;
            if(!this.getLayers()[layer]) {
                this.getLayers()[layer] = new Array();
            }
            this.getLayers()[layer].push(object);
            object.setZIndex(zIndex);
        }
    }

    remove(object) {
        let removedIndex = object.getZIndex();
        
        let layer = Math.floor(removedIndex/this.getMaxLayerSize())-1;

        let pos = this.getLayers()[layer].indexOf(object);
        this.getLayers()[layer].splice(pos, 1);

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
      