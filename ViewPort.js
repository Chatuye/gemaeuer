class ViewPort {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    moveBy(dX, dY) {
        this.x1 += dX;
        this.y1 += dY;
        this.x2 += dX;
        this.y2 += dY;
    }

    zoom(zF) {
        this.x1 = this.x1*zF;
        this.y1 = this.y1*zF;
        this.x2 = this.x2*zF;
        this.y2 = this.y2*zF;
    }
}
