import { StateObject } from '../core/StateObject.js';
import { ViewPortState } from './ViewPort.js';
import { StageZIndexManagerState } from './StageZIndexManager.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';



export class RootObjectState extends StateObject {
    constructor() {
        super();

        this.objectType = "ROOTOBJECT";
        
        this.viewPort = -1;
        this.zManager = -1;
        this.children = new Array();
    }
}

export class RootObject {
	constructor(state) {
        this.state = state;
        dataManager.registerObject(this);

        this.div = document.getElementById("content");
        this.boundingClientRect = this.div.getBoundingClientRect();

        if(this.state.viewPort == -1) {
            let viewPortState = new ViewPortState();

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
        this.pickedUpChild = null;
        this.children = new Array();
        for(let i = 0; i < this.state.children.length; i++) {
			this.children.push(dataManager.getObject(this.state.children[i]));
		}

        this._boundUpdate = this.update.bind(this);
        window.addEventListener("resize", this._boundUpdate);
    }

    update() {
        this.boundingClientRect = this.div.getBoundingClientRect();
        // Renderer handles markAllDirty on resize — but we still need to notify
        // children for viewport recalculation (Hand, etc. listen to layout:changed)
        this.updateChildren();
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
        this.state.children.push(child.state.objectId);
    }
    destroy() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].destroy();
            this.div.removeChild(this.children[i].div);
        }
        window.removeEventListener("resize", this._boundUpdate);
    }

    getScreenDimensions() {
        let clientRect = this.boundingClientRect;
        return clientRect;
    }
}

objectRegistry.register("ROOTOBJECT", RootObject);
