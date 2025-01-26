class Stage extends ZoomableElement {
	constructor(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, w, h, uiScaling, viewPortType, vW, vH, vpScaling) {
        super(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, w, h, uiScaling);



        this.zoomPerTick = 40;

        let scaledVW = vW;
        let scaledVH = vH;

        this.viewPort = new ViewPort(this, viewPortType, scaledVW, scaledVH, vpScaling);
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

    
    getScreenDimensionsOfChild(behaviour, type, width, height, uiScaling) {
        let w = 0;
        let h = 0;
/*
        console.log("behaviour: "+behaviour)
        console.log("type: "+type)
        console.log("width: "+width)
        console.log("height: "+height)
        console.log("uiScaling: "+uiScaling)
*/
        if(type == "relative") {
            w = width * this.getScreenDimensions().width;
            h = height * this.getScreenDimensions().height;
        } else if(type == "absolute") {
            w = width;
            h = height;
            if(behaviour == "zoom") {
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
}