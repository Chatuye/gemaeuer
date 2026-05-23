import { UIDefinitions } from './config/UIDefinitions.js';
import { ZoomableElementState, ZoomableElement } from './ZoomableElement.js';
import { ViewPortState } from './ViewPort.js';
import { StageZIndexManagerState } from './StageZIndexManager.js';
import { dataManager } from '../core/DataManager.js';
import { renderer } from '../rendering/Renderer.js';



export class StageState extends ZoomableElementState {
    constructor() {
        super();

        this.objectType = "STAGE";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

export class Stage extends ZoomableElement {
	constructor(state) {
        super(state);


        if(this.state.viewPort == -1) {
            let viewPortState = new ViewPortState();

            if(this.parent.state.objectType === "ROOTOBJECT") viewPortState.scaleWithWindowSize = true;
            viewPortState.parent.referenceId = this.state.objectId;
            this.viewPort = dataManager.createObject(viewPortState);
            this.state.viewPort = this.viewPort.state.objectId;
        } else {
            this.viewPort = dataManager.getObject(this.state.viewPort);
        }

        if(this.state.zManager == -1) {
            let stageZIndexManagerState = new StageZIndexManagerState()
            this.zManager = dataManager.createObject(stageZIndexManagerState);
            this.state.zManager = this.zManager.state.objectId;
        } else {
            this.zManager = dataManager.getObject(this.state.zManager);
        }


        this.children = new Array();


        this.zoomPerTick = 40;

        // No per-element wheel listener — Renderer forwards wheel events via onWheel

        for(let i = 0; i < this.state.children.length; i++) {
			this.children.push(dataManager.getObject(this.state.children[i]));
		}
    }



    onWheel(e) {
        e.stopPropagation();
        e.preventDefault();
		
		this.zoom(e.deltaY, e.clientX, e.clientY);
    }
	onMouseMove(e) {
        let cursorX = this.cursorX;
        let cursorY = this.cursorY;
        super.onMouseMove(e);
        
        let dX = e.clientX - cursorX;
        let dY = e.clientY - cursorY;

        if(!this.pickedUp) {
            this.pan(dX, dY);
        }
	}

    

    /**
     * Called when this stage's parent changes (resize, viewport change).
     * Recalculates this stage's own viewport scale and propagates to children.
     *
     * The propagation chain is: parent zooms → notifyChildStages() →
     * child.onParentChange() → recalculates viewport → notifyViewportChanged()
     * → marks ZOOM children dirty → notifyChildStages() → recurses into
     * grandchild stages. This ensures arbitrarily nested stages all update
     * their viewport scales when any ancestor zooms.
     */
    onParentChange() {
        super.onParentChange();

        this.viewPort.calculateScale();
        renderer.notifyViewportChanged(this.viewPort.state.objectId);
        this.notifyChildStages();
    }
    registerChild(child) {
        this.children.push(child);
        this.state.children.push(child.state.objectId);
    }



    pan(dX, dY) {
		dX = dX/this.viewPort.getScaleX();
		dY = dY/this.viewPort.getScaleY();

        this.viewPort.pan(dX, dY);
        renderer.notifyViewportChanged(this.viewPort.state.objectId);
        this.notifyChildStages();
	}
    zoom(z, x, y) {
		let cursorOnDiv = this.convertScreenPosToDivPos(x, y);

        let d = this.getScreenDimensions();
        let relX = cursorOnDiv.x/d.width;
        let relY = cursorOnDiv.y/d.height;

		let zoomInc = Math.round((z/100)*this.zoomPerTick);
        let vD = this.viewPort.getDimensions()
        let q = vD.width/vD.height;

        let zoomIncX = zoomInc*q;
		let zoomIncY = zoomInc;

        this.viewPort.zoom(zoomIncX*relX, zoomIncY*relY, zoomIncX, zoomIncY);
        renderer.notifyViewportChanged(this.viewPort.state.objectId);
        this.notifyChildStages();
    }

    /**
     * Notify child stages that their parent's viewport changed, so they
     * can recalculate their own viewport scale. This propagates recursively:
     * each child stage's onParentChange() calls notifyChildStages() on itself,
     * ensuring arbitrarily deep nesting works correctly.
     *
     * The Renderer handles DOM updates via dirty propagation, but viewport
     * scale recalculation is a logical operation that must be triggered
     * explicitly through this call chain.
     */
    notifyChildStages() {
        for (const child of this.children) {
            if (child.onParentChange) child.onParentChange();
        }
    }

    getUIScale(keepAspectRatio) {
        let sX = this.getScreenDimensions().width / UIDefinitions.baseWidth;
        let sY = this.getScreenDimensions().height / UIDefinitions.baseHeight;
        if(keepAspectRatio)
            return {scaleX: Math.min(sX, sY), scaleY: Math.min(sX, sY)}
        else 
            return {scaleX: sX, scaleY: sY}
    }

    getViewPort() {
        return this.viewPort;
    }



    convertDivPosToViewPortPos(x, y) {
        return renderer.localToViewport(x, y, this.state.objectId);
    }

    destroy() {
        for (const child of this.children) {
            child.destroy();
        }
        super.destroy();
    }
}
