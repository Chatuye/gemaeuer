class TileDO extends FlippableObjectDO {
    constructor() {
        super();
    }
}

class Tile extends FlippableObject {
	constructor(parent, dataObject) {
//        super(parent, 0, "zoom", "absolute", x, y, "zoom", "absolute", false, "tile-front", "tile-back", facing);

        dataObject.positionBehaviour = "ZOOM";
        dataObject.positionType = "ABSOLUTE";
        dataObject.dimensionsBehaviour = "ZOOM";
        dataObject.dimensionsType = "ABSOLUTE";
        dataObject.uiScaling = true;
        dataObject.svg01Key = "tile-front";
        dataObject.svg02Key = "tile-back";
        dataObject.zIndex = 0;// * parent.zManager.getMaxLayerSize();

        super(parent, dataObject);

        this.svgFront.getElementById("text").firstChild.innerHTML = Math.floor((Math.random()*9))+1;
    }



}