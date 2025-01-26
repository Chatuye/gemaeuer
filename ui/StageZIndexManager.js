class StageZIndexManager {
	constructor() {
//        console.log("StageZIndexManager");

        this.maxLayerSize = 100000;
        this.layers = new Array(); 
    }

    createLayer() {
        this.layers.push(new Map());
    }
    set(layer, object, index) {
        if(!index) index = this.layers[layer].size;
        let newIndex = ((layer * this.maxLayerSize) + index)
        this.layers[layer].set(object, newIndex)

        object.div.style.zIndex = newIndex;
    }

    remove(layer, object) {
        let removedIndex = this.layers[layer].get(object);
        this.layers[layer].delete(object);

        this.layers[layer].forEach(function(value, key, map) { this.removeHelper(value, key, map, removedIndex) }, this);
    }
    removeHelper(value, key, map, removedIndex) {
        if(value>removedIndex) {
            map.set(key, (value-1));
            key.div.style.zIndex = (value-1);
        }
    }

}
      