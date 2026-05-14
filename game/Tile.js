import { FlippableObjectSO, FlippableObject } from '../zui/FlippableObject.js';
import { objectRegistry } from '../dataManagement/ObjectRegistry.js';



export class TileSO extends FlippableObjectSO {
    constructor() {
        super();

        this.objectType = "TILE";

        this.value = 0;
    }
}

export class Tile extends FlippableObject {
	constructor(stateObject) {
        super(stateObject);
        
        this.svgFront.getElementById("text").firstChild.innerHTML = this.stateObject.value;
    }
}

objectRegistry.register("TILE", Tile);
