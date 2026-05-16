import { StateObject } from '../core/StateObject.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';



export class ViewPortState extends StateObject {
    constructor() {
        super();
        
        this.objectType = "VIEWPORT";

        this.parent = { referenceId: -1 };

        this.type = "RELATIVE";
        this.x = 0;
        this.y = 0;
        this.width = 1.0;
        this.height = 1.0;
        this.scaleWithWindowSize = false;
        this.scaleX = 1.0;
        this.scaleY = 1.0;
    }
}

export class ViewPort {
    constructor(state) {
        this.state = state;
        dataManager.registerObject(this);

        this.parent = dataManager.getObject(this.state.parent.referenceId);
        this.calculateScale();
    }
    
    pan(dX, dY, callback) {
        this.state.x -= dX;
        this.state.y -= dY;
        if(callback) this.calculateScale(callback);
    }
    zoom(dX, dY, dW, dH, callback) {
        let w = 0;
        let h = 0;
        if(this.state.type == "ABSOLUTE") {
            w = this.state.width + dW;
            h = this.state.height + dH;
        } else if (this.state.type == "RELATIVE") {
            let sD = this.getScreenDimensions()
            w = ((this.state.width * sD.width) + dW)/sD.width;
            h = ((this.state.height * sD.height) + dH)/sD.height;
        }

        if((w > 0) && (h > 0)) {
            if(this.state.scaleWithWindowSize) {
                let uiScale = this.parent.getUIScale(true);
                dX /= uiScale.scaleX;
                dY /= uiScale.scaleY;
            }
    
            this.state.x -= dX;
            this.state.y -= dY;
            this.state.width = w;
            this.state.height = h;
            if(callback) this.calculateScale(callback);
            else this.calculateScale();
        }
    }
    getDimensions() {
        let w = this.state.width;
        let h = this.state.height;
        if(this.state.scaleWithWindowSize) {
            let uiScale = this.parent.getUIScale(true);
            w /= uiScale.scaleX;
            h /= uiScale.scaleY;
        }
        
        let sD = this.getScreenDimensions();
        if(this.state.type == "RELATIVE") {
            w *= sD.width;
            h *= sD.height;
        }

        return {width: w, height: h, screenDimensions: sD};
    }

    getScreenDimensions() {
        let d = this.parent.getScreenDimensions();
        let w = d.width;
        let h = d.height;
        return {width: w, height: h};
    }

    calculateScale(callback) {
        let d = this.getDimensions();
        this.state.scaleX = d.screenDimensions.width/d.width;
        this.state.scaleY = d.screenDimensions.height/d.height;

        if(callback) callback();
    }

    getScaleX() {
        return this.state.scaleX;
    }
    getScaleY() {
        return this.state.scaleY;
    }
    getX() {
        return this.state.x;
    }
    getY() {
        return this.state.y;
    }
}

objectRegistry.register("VIEWPORT", ViewPort);
