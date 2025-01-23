class ViewPort {
    constructor(p, t, w, h) {
        this.parent = p;
        this.type = t;
        this.x = 0;
        this.y = 0;
        this.width = w;
        this.height = h;

        this.calculateScale();
    }

    pan(dX, dY, callback) {
        this.x -= dX;
        this.y -= dY;
        if(callback) this.calculateScale(callback);
    }

    zoom(dX, dY, dW, dH, callback) {
        let w = 0;
        let h = 0;
        if(this.type == "absolute") {
            w = this.width + dW;
            h = this.height + dH;
        } else if (this.type == "relative") {
            let d = this.getDimensions()
            w = (d.width + dW)/d.screenDimensions.width;
            h = (d.height + dH)/d.screenDimensions.height;
        }

        if((w > 0) && (h > 0)) {
            this.x -= dX;
            this.y -= dY;
            this.width = w;
            this.height = h;
            if(callback) this.calculateScale(callback);
        }
    }

    getDimensions() {
        let w = this.width;
        let h = this.height;
        let sD = this.getScreenDimensions();;
        if(this.type == "relative") {
            w *= sD.width;
            h *= sD.height;
        }
        return {width: w, height: h, screenDimensions: sD};
    }

    getScreenDimensions() {
        let w = 0;
        let h = 0;
        if(this.parent == null) {
            w = mainBody.getBoundingClientRect().width;
            h = mainBody.getBoundingClientRect().height;
        } else {
            let d = this.parent.getScreenDimensions();
            w = d.width;
            h = d.height;
        }
        return {width: w, height: h};
    }

    calculateScale(callback) {
        let d = this.getDimensions();
        this.scaleX = d.screenDimensions.width/d.width;
        this.scaleY = d.screenDimensions.height/d.height;

        if(callback) callback();
    }

    getScaleX() {
        return this.scaleX;
    }
    getScaleY() {
        return this.scaleY;
    }
}