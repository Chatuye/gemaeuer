class Stage extends ZoomableElement {
	constructor(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH) {
        super(parent, "zoom", positionType, x, y, "zoom", dimensionsType, w, h);



        this.zoomPerTick = 40;

        this.viewPort = new ViewPort(this, viewPortType, vW, vH);
        this.children = new Array();

        this.div.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
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

    

    onParentChange() {
        super.onParentChange();

        this.viewPort.calculateScale(this.updateChildren.bind(this));
    }
    updateChildren() {
        this.children.forEach((child) => child.onParentChange())
    }
    registerChild(child) {
        this.children.push(child);
    }



    pan(dX, dY) {
		dX = dX/this.viewPort.getScaleX();
		dY = dY/this.viewPort.getScaleY();

        this.viewPort.pan(dX, dY, this.updateChildren.bind(this));
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

        this.viewPort.zoom(zoomIncX*relX, zoomIncY*relY, zoomIncX, zoomIncY, this.updateChildren.bind(this));
    }
}