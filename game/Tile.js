class TileSO extends FlippableObjectSO {
    constructor() {
        super();

        this.objectType = "TILE";

        this.value = 0;
    }
}

class Tile extends FlippableObject {
	constructor(stateObject) {
        super(stateObject);
        
        this.svgFront.getElementById("text").firstChild.innerHTML = this.stateObject.value;
    }
}
