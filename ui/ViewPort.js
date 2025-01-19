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
            w = (this.getWidth() + dW)/this.getScreenWidth();
            h = (this.getHeight() + dH)/this.getScreenHeight();
        }

        if((w > 0) && (h > 0)) {
            this.x -= dX;
            this.y -= dY;
            this.width = w;
            this.height = h;
            if(callback) this.calculateScale(callback);
        }
    }

    getWidth() {
        let w = this.width;
        if(this.type == "relative")
            w *= this.getScreenWidth();
        return w;
    }

    getHeight() {
        let h = this.height;
        if(this.type == "relative")
            h *= this.getScreenHeight();
        return h;
    }

    getScreenWidth() {
        let w = 0;
        if(this.parent == null)
            w = mainBody.getBoundingClientRect().width;
        else
            w = this.parent.getScreenWidth();
        return w;
    }

    getScreenHeight() {
        let w = 0;
        if(this.parent == null)
            w = mainBody.getBoundingClientRect().width;
        else
            w = this.parent.getScreenHeight();
        return w;
    }

    calculateScale(callback) {
        this.scaleX = this.getScreenWidth()/this.getWidth();
        this.scaleY = this.getScreenHeight()/this.getHeight();

        if(callback) callback();
    }

    getScaleX() {
        return this.scaleX;
    }
    getScaleY() {
        return this.scaleY;
    }
}