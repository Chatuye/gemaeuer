class ViewPortSO extends StateObject {
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

class ViewPort {
    constructor(stateObject) {
        this.stateObject = stateObject;
        dataManager.registerObject(this);

        this.parent = dataManager.getObject(this.stateObject.parent.referenceId);
        this.calculateScale();
    }
    
    pan(dX, dY, callback) {
        this.stateObject.x -= dX;
        this.stateObject.y -= dY;
        if(callback) this.calculateScale(callback);
    }
    zoom(dX, dY, dW, dH, callback) {
        let w = 0;
        let h = 0;
        if(this.stateObject.type == "ABSOLUTE") {
            w = this.stateObject.width + dW;
            h = this.stateObject.height + dH;
        } else if (this.stateObject.type == "RELATIVE") {
            let sD = this.getScreenDimensions()
            w = ((this.stateObject.width * sD.width) + dW)/sD.width;
            h = ((this.stateObject.height * sD.height) + dH)/sD.height;
        }

        if((w > 0) && (h > 0)) {
            if(this.stateObject.scaleWithWindowSize) {
                let uiScale = this.parent.getUIScale(true);
                dX /= uiScale.scaleX;
                dY /= uiScale.scaleY;
            }
    
            this.stateObject.x -= dX;
            this.stateObject.y -= dY;
            this.stateObject.width = w;
            this.stateObject.height = h;
            if(callback) this.calculateScale(callback);
        }
    }
    getDimensions() {
        let w = this.stateObject.width;
        let h = this.stateObject.height;
        if(this.stateObject.scaleWithWindowSize) {
            let uiScale = this.parent.getUIScale(true);
            w /= uiScale.scaleX;
            h /= uiScale.scaleY;
        }
        
        let sD = this.getScreenDimensions();
        if(this.stateObject.type == "RELATIVE") {
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
        this.stateObject.scaleX = d.screenDimensions.width/d.width;
        this.stateObject.scaleY = d.screenDimensions.height/d.height;

        if(callback) callback();
    }

    getScaleX() {
        return this.stateObject.scaleX;
    }
    getScaleY() {
        return this.stateObject.scaleY;
    }
    getX() {
        return this.stateObject.x;
    }
    getY() {
        return this.stateObject.y;
    }
}
