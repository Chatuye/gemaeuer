class ViewPortDO {
    constructor() {
        this.objectId = -1;
        this.objectType = "VIEWPORT";
        this.objectStatus = "NEW";

        this.parent = { referenceId: -1 };
        this.type = "RELATIVE";
        this.x = 0;
        this.y = 0;
        this.width = 1.0;
        this.height = 1.0;
        this.uiScaling = false;
        this.scaleX = 1.0;
        this.scaleY = 1.0;
    }
}

class ViewPort {
    constructor(parent, dataObject) {
        this.parent = parent;
        this.dataObject = dataObject;
        if(this.dataObject.objectStatus == "NEW") {
            this.calculateScale();
            this.dataObject.objectStatus = "EXISTING";
        }
    }

    setParent(p) {
        this.parent = p;
        //this.dataObject = this.parent.data.id;
    }
    
    pan(dX, dY, callback) {
        this.dataObject.x -= dX;
        this.dataObject.y -= dY;
        if(callback) this.calculateScale(callback);
    }
    zoom(dX, dY, dW, dH, callback) {
        let w = 0;
        let h = 0;
        if(this.dataObject.type == "ABSOLUTE") {
            w = this.dataObject.width + dW;
            h = this.dataObject.height + dH;
        } else if (this.dataObject.type == "RELATIVE") {
            let sD = this.getScreenDimensions()
            w = ((this.dataObject.width * sD.width) + dW)/sD.width;
            h = ((this.dataObject.height * sD.height) + dH)/sD.height;
        }

        if((w > 0) && (h > 0)) {
            if(this.dataObject.uiScaling) {
                let uiScale = this.parent.getUIScale(true);
                dX /= uiScale.scaleX;
                dY /= uiScale.scaleY;
            }
    
            this.dataObject.x -= dX;
            this.dataObject.y -= dY;
            this.dataObject.width = w;
            this.dataObject.height = h;
            if(callback) this.calculateScale(callback);
        }
    }
    getDimensions() {
        let w = this.dataObject.width;
        let h = this.dataObject.height;
        if(this.dataObject.uiScaling) {
//            console.log(this.parent)
            let uiScale = this.parent.getUIScale(true);
            w /= uiScale.scaleX;
            h /= uiScale.scaleY;
        }
        
        let sD = this.getScreenDimensions();
        if(this.dataObject.type == "RELATIVE") {
            w *= sD.width;
            h *= sD.height;
        }

        return {width: w, height: h, screenDimensions: sD};
    }

    getScreenDimensions() {
        let w = 0;
        let h = 0;
        if(this.parent instanceof HTMLElement) {
            w = this.parent.getBoundingClientRect().width;
            h = this.parent.getBoundingClientRect().height;
        } else {
            let d = this.parent.getScreenDimensions();
            w = d.width;
            h = d.height;
        }
        return {width: w, height: h};
    }

    calculateScale(callback) {
        let d = this.getDimensions();
        this.dataObject.scaleX = d.screenDimensions.width/d.width;
        this.dataObject.scaleY = d.screenDimensions.height/d.height;

        if(callback) callback();
    }

    getScaleX() {
        return this.dataObject.scaleX;
    }
    getScaleY() {
        return this.dataObject.scaleY;
    }
    getX() {
        return this.dataObject.x;
    }
    getY() {
        return this.dataObject.y;
    }
}