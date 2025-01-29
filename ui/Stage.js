class StageDO extends ZoomableElementDO {
    constructor() {
        super();
        
        this.isMainStage = false;
        this.viewPortDO = new ViewPortDO();
        this.children = new Array();
    }
}

class Stage extends ZoomableElement {
	constructor(parent, dataObject) {
        super(parent, dataObject);

        this.viewPort = new ViewPort(this, this.dataObject.viewPortDO)
        this.children = new Array();



        this.zoomPerTick = 40;
        this.zManager = new StageZIndexManager();

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

    
    getUIScale(keepAspectRatio) {
        let sX = this.getScreenDimensions().width / UIDefinitions.baseWidth;
        let sY = this.getScreenDimensions().height / UIDefinitions.baseHeight;
        if(keepAspectRatio)
            return {scaleX: Math.min(sX, sY), scaleY: Math.min(sX, sY)}
        else 
            return {scaleX: sX, scaleY: sY}
    }
    getScreenDimensionsOfChild(behaviour, type, width, height, uiScaling) {
        let w = 0;
        let h = 0;

        if(type == "RELATIVE") {
            w = width * this.getScreenDimensions().width;
            h = height * this.getScreenDimensions().height;
        } else if(type == "ABSOLUTE") {
            w = width;
            h = height;
            if(behaviour == "ZOOM") {
                w *= this.viewPort.getScaleX();
                h *= this.viewPort.getScaleY();
            }
            if(uiScaling) {
                let uiScale = this.getUIScale(true);
                w *= uiScale.scaleX;
                h *= uiScale.scaleY;
            }
        }
        return {width: w, height: h};
    }
    getViewPort() {
        return this.viewPort;
    }



    convertDivPosToViewPortPos(x, y) {
        let d = this.getScreenDimensions();
        let relX = x/d.width;
        let relY = y/d.height;

        let vD = this.viewPort.getDimensions();
        let vX = this.viewPort.getX() + (vD.width * relX);
		let vY = this.viewPort.getY() + (vD.height * relY);
        return {x: vX, y: vY};
    }
}