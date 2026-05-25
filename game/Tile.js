import { FlippableObjectState, FlippableObject } from '../zui/FlippableObject.js';
import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { renderer } from '../rendering/Renderer.js';



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

    drop() {
        // If tile is in SCREEN layout (freshly spawned from panel), convert to WORLD
        if (this.state.positionBehaviour === "FIXED") {
            let cursorOnDiv = renderer.screenToLocal(this.cursorX, this.cursorY, this.state.objectId);
            let screenBounds = renderer.getComputedBounds(this.state.objectId);
            let relX = cursorOnDiv.x / screenBounds.width;
            let relY = cursorOnDiv.y / screenBounds.height;

            Object.assign(this.state, LayoutPresets.WORLD);
            renderer.updateLayoutPreset(this.state.objectId);

            let newDims = this.getScreenDimensions();

            let cardTopLeftScreenX = this.cursorX - (newDims.width * relX);
            let cardTopLeftScreenY = this.cursorY - (newDims.height * relY);

            let cursorOnParent = renderer.screenToLocal(cardTopLeftScreenX, cardTopLeftScreenY, this.parent.state.objectId);
            let cursorOnParentVP = renderer.localToViewport(cursorOnParent.x, cursorOnParent.y, this.parent.state.objectId);
            renderer.setStateMulti(this.state.objectId, { x: cursorOnParentVP.x, y: cursorOnParentVP.y });
        }

        super.drop();
    }

    destroy() {
        eventBus.emit('tile:deleted', { tile: this });
        super.destroy();
    }
}

objectRegistry.register("TILE", Tile);
