import { StateObject } from '../core/StateObject.js';
import { LayoutPresets } from './config/LayoutPresets.js';
import { randomHexColorCode } from '../utils.js';
import { dataManager } from '../core/DataManager.js';
import { renderer } from '../rendering/Renderer.js';



export class ZoomableElementState extends StateObject {
    constructor() {
        super();

        this.objectType = "ZOOMABLEELEMENT";
        
        this.parent = { referenceId: -1 };
        
        Object.assign(this, LayoutPresets.WORLD);
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.zIndex = 0;
    }
}

export class ZoomableElement {
	constructor(state) {
        this.state = state;
        dataManager.registerObject(this);


        this.parent = dataManager.getObject(this.state.parent.referenceId);

        this.div = document.createElement("div");
        this.div.style.position = "absolute";
		this.div.style.backgroundColor = randomHexColorCode();
		this.parent.div.appendChild(this.div);
        
		
        this.cursorX = 0;
		this.cursorY = 0;
        this.picking = null;
        this.pickedUp = false;
        this.pickedUpChild = null;


        // Register with the Renderer BEFORE zManager.set (which calls setZIndex → renderer.setState)
        renderer.register(this.state.objectId, {
            state: this.state,
            div: this.div,
            parentId: this.parent.state.objectId,
            viewportId: this.parent.viewPort?.state?.objectId ?? null
        });

        this.parent.zManager.set(this);
    }



    onDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();
    }
    onMouseDown(e) {
        e.stopPropagation();

		this.cursorX = e.clientX;
		this.cursorY = e.clientY;

        // Start drag capture immediately so mousemove/mouseup are forwarded during picking phase
        renderer.startDrag(this.state.objectId);

        if(this.state.positionType == "ABSOLUTE")
            this.picking = window.setTimeout(this.grabbed.bind(this), 200);
	}
	onMouseMove(e) {
        if(this.picking) {
            clearTimeout(this.picking);
            this.pickedUp = false;
            this.picking = null;
        }

        let dX = e.clientX - this.cursorX;
        let dY = e.clientY - this.cursorY;
        this.cursorX = e.clientX;
        this.cursorY = e.clientY;
   
        if(this.pickedUp) {
            if(this.state.positionBehaviour == "ZOOM") {
                dX /= this.parent.getViewPort().getScaleX();
                dY /= this.parent.getViewPort().getScaleY();
            }
            this.moveTo((this.state.x + dX), (this.state.y + dY));
        }
	}
	onMouseUp(e) {
        if(this.picking) {
            clearTimeout(this.picking);
            this.picking = null;
        }
        if(this.pickedUp) this.drop(e.clientX, e.clientY);

        renderer.endDrag();
	}


    moveTo(x, y) {
        renderer.setState(this.state.objectId, 'x', x);
        renderer.setState(this.state.objectId, 'y', y);
    }
    grabbed() {
        this.parent.pickedUpChild = this;
        this.picking = null;
        this.pickedUp = true;
		renderer.setState(this.state.objectId, 'filter', "drop-shadow(0px 0px 4px rgba(0, 0, 0, 1.0)) drop-shadow(0px 0px 24px rgba(255, 255, 255, 0.33))");
   
        if(this.parent.zManager) {
            this.parent.zManager.remove(this);
            this.state.zIndex = 3;
            this.parent.zManager.set(this);
        }
    }
    /**
     * Called when an object is dropped. Clears the picked-up state and resets
     * visual style.
     *
     * IMPORTANT: Must clear parent.pickedUpChild so that Hand.positionCards()
     * correctly counts all cards in the fan. Without this, the fan layout
     * would miscalculate positions after a card is returned to the hand.
     */
    drop() {
        this.pickedUp = false;
        this.parent.pickedUpChild = null;
		this.setDefaultStyle();
        
        if(this.parent.zManager) {
            this.parent.zManager.remove(this);
            this.state.zIndex = 0;
            this.parent.zManager.set(this);
        }
    }
    setDefaultStyle() {
		renderer.setState(this.state.objectId, 'filter', "drop-shadow(0px 0px 0px rgba(0, 0, 0, 1.0))");
    }



    onParentChange() {
        renderer.markDirty(this.state.objectId);
    }


    /**
     * Get screen dimensions for this object.
     *
     * IMPORTANT: Only uses cached Renderer bounds if the render node is NOT dirty.
     * After a layout preset change (updateLayoutPreset), the render node is dirty
     * and cached bounds are STALE (computed with the old preset). In that case,
     * falls through to synchronous computation using the current state fields.
     * This is critical for Card.grabbed() and Card.onDroppedOnStage() which
     * need fresh dimensions immediately after a preset swap.
     */
    getScreenDimensions() {
        let bounds = renderer.getComputedBounds(this.state.objectId);
        let node = renderer.renderNodes.get(this.state.objectId);
        // Only use cached bounds if render node is NOT dirty (bounds are fresh)
        if (bounds && !node?.dirty && (bounds.width !== 0 || bounds.height !== 0)) return { width: bounds.width, height: bounds.height };
        // Compute directly (render node is dirty or before first frame tick)
        let width = 0;
        let height = 0;
        if(this.state.dimensionsType == "RELATIVE") {
            width = this.state.width * this.parent.getScreenDimensions().width;
            height = this.state.height * this.parent.getScreenDimensions().height;
        } else if(this.state.dimensionsType == "ABSOLUTE") {
            width = this.state.width;
            height = this.state.height;
            if(this.state.dimensionsBehaviour == "ZOOM") {
                width *= this.parent.getViewPort().getScaleX();
                height *= this.parent.getViewPort().getScaleY();
            }
            if(this.state.scaleWithWindowSize) {
                let uiScale = this.getMainStage().getUIScale(true);
                width *= uiScale.scaleX;
                height *= uiScale.scaleY;
            }
        }
        return {width: width, height: height};
    }


    setZIndex(index) {
        renderer.setState(this.state.objectId, 'zIndex', index);
    }    
    getZIndex() {
        return this.state.zIndex;
    }
    getMainStage() {
        if(this.parent.state.objectType === "ROOTOBJECT")
            return this;
        else
            return this.parent.getMainStage();
    }


    convertScreenPosToDivPos(x, y) {
        let result = renderer.screenToLocal(x, y, this.state.objectId);
        if (result) return result;
        // Fallback
        let cursorXOnDiv = Math.round(x - this.div.getBoundingClientRect().left);
		let cursorYOnDiv = Math.round(y - this.div.getBoundingClientRect().top);
        return { x: cursorXOnDiv, y: cursorYOnDiv};
    }
}
