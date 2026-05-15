import { FlippableObjectState, FlippableObject } from '../zui/FlippableObject.js';
import { objectRegistry } from '../core/ObjectRegistry.js';



export class TileState extends FlippableObjectState {
    constructor() {
        super();

        this.objectType = "TILE";

        this.value = 0;
    }
}

export class Tile extends FlippableObject {
	constructor(state) {
        super(state);
        
        this.svgFront.getElementById("text").firstChild.innerHTML = this.state.value;
    }
}

objectRegistry.register("TILE", Tile);
