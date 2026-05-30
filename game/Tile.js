import { FlippableObjectState, FlippableObject } from '../zui/FlippableObject.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';



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

    destroy() {
        eventBus.emit('tile:deleted', { tile: this });
        super.destroy();
    }
}

objectRegistry.register("TILE", Tile);
