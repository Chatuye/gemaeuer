class Stage extends ZoomableElement {
	constructor(parent, positionType, x, y, dimensionsType, w, h, viewPortType, vW, vH) {
        super(parent, positionType, x, y, dimensionsType, w, h);



        this.zoomPerTick = 40;

        this.viewPort = new ViewPort(this, viewPortType, vW, vH);
        this.children = new Array();

        this.div.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
        this.div.addEventListener("contextmenu", this.onContextMenu.bind(this), { passive: false });
        this.div.addEventListener("dblclick", this.onDoubleClick.bind(this), { passive: false });
    }



    onDoubleClick(e) {
        e.stopPropagation();
        e.preventDefault();

        let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
        let cursorOnVP = this.convertDivPosToViewPortPos(cursorOnDiv.x, cursorOnDiv.y);

        let x = cursorOnVP.x;
        let y = cursorOnVP.y;
        this.registerChild(new ZoomableElement(this, "absolute", x, y, "absolute", 100, 100));
    }
    onContextMenu(e) {
        e.stopPropagation();
        e.preventDefault();
		
        let cursorOnDiv = this.convertScreenPosToDivPos(e.clientX, e.clientY);
        let cursorOnVP = this.convertDivPosToViewPortPos(cursorOnDiv.x, cursorOnDiv.y);

        let x = cursorOnVP.x;
        let y = cursorOnVP.y;

        let q = this.viewPort.getScreenWidth()/this.viewPort.getScreenHeight();
        this.registerChild(new Stage(this, "absolute", x, y, "absolute", 400*q, 400, "absolute", 800*q, 800));
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

        let relX = cursorOnDiv.x/this.getScreenWidth();
        let relY = cursorOnDiv.y/this.getScreenHeight();

		let zoomInc = Math.round((z/100)*this.zoomPerTick);
        let q = this.viewPort.getWidth()/this.viewPort.getHeight();

        let zoomIncX = zoomInc*q;
		let zoomIncY = zoomInc;

        this.viewPort.zoom(zoomIncX*relX, zoomIncY*relY, zoomIncX, zoomIncY, this.updateChildren.bind(this));
    }
}