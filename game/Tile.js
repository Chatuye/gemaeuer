class TileDO extends FlippableObjectDO {
    constructor() {
        super();

        this.objectType = "TILE";

        this.value = 0;
    }
}

class Tile extends FlippableObject {
	constructor(dataObject) {
        super(dataObject);
        
        this.svgFront.getElementById("text").firstChild.innerHTML = this.dataObject.value;
    }



}