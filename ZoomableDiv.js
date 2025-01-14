class ZoomableDiv extends StageDiv{
	constructor(stage, x, y, w, h) {
		super(stage, stage);

		this.div.style.backgroundColor = "#FF0000";

		this.childDivs = new Array();
		
		let zoomDiv1 = new ZoomObject(this, "tile-front", "tile-back", "back", 0, 0);
		let zoomDiv2 = new ZoomObject(this, "tile-front", "tile-back", "front", 100, 100);
		let zoomDiv3 = new ZoomObject(this, "tile-front", "tile-back", "back", 0, 100);
		let zoomDiv4 = new ZoomObject(this, "tile-front", "tile-back", "front", 100, 0);

		this.viewPort = new ViewPort(0, 0, 200, 200);
		this.viewPortScale = 0;

		this.coordinate.updateBaseValues(x, y);
		this.dimensions.updateBaseValues(w, h);

		this.viewX = 0;
		this.viewY = 0;

		this.cursorX = 0;
		this.cursorY = 0;
	}

	registerChildDiv(cD) {
		// missing zIndex management???
		this.childDivs.push(cD);
	}

	onDimensionsChange() {
		super.onDimensionsChange();
		this.viewPortScale = this.dimensions.stageWidth/(this.viewPort.x2-this.viewPort.x1);
		this.renderViewPort();
	}

	pan(dX, dY) {
		dX = dX/this.viewPortScale;
		dY = dY/this.viewPortScale;

		this.viewPort.x1 = this.viewPort.x1-dX;
		this.viewPort.y1 = this.viewPort.y1-dY;
		this.viewPort.x2 = this.viewPort.x2-dX;
		this.viewPort.y2 = this.viewPort.y2-dY;

		this.renderViewPort();
	}

	renderViewPort() {
		this.childDivs.forEach((childDiv) => childDiv.onReRender())
	}


	zoom(z, x, y) {
		let offsetLeft = (this.div.offsetLeft + this.div.parentElement.offsetLeft);
		let offsetTop = (this.div.offsetTop + this.div.parentElement.offsetTop);

		let cursorOffsetLeft = (x - offsetLeft);
		let cursorOffsetTop = (y - offsetTop);

		let relX1 = cursorOffsetLeft/this.dimensions.stageWidth;
		let relX2 = 1-relX1;
		let relY1 = cursorOffsetTop/this.dimensions.stageHeight;
		let relY2 = 1-relY1;

		let zoomInc = Math.round((z/100)*20);
		let zoomIncX1 = zoomInc*relX1;
		let zoomIncX2 = zoomInc*relX2;
		let zoomIncY1 = zoomInc*relY1;
		let zoomIncY2 = zoomInc*relY2;

		let viewPortWidth = this.viewPort.x2 - this.viewPort.x1
		let viewPortHeight = this.viewPort.y2 - this.viewPort.y1

		if(((viewPortWidth+zoomInc)>0)&&((viewPortHeight+zoomInc)>0)) {
			this.viewPort.x1 = this.viewPort.x1-zoomIncX1;
			this.viewPort.y1 = this.viewPort.y1-zoomIncY1;
			this.viewPort.x2 = this.viewPort.x2+zoomIncX2;
			this.viewPort.y2 = this.viewPort.y2+zoomIncY2;
		}

		this.viewPortScale = this.dimensions.stageWidth/(this.viewPort.x2-this.viewPort.x1);
		this.renderViewPort();
	}

	onLoad() {
		super.onLoad();
		this.viewPortScale = this.dimensions.stageWidth/(this.viewPort.x2-this.viewPort.x1);

		this.div.addEventListener("wheel", this.onWheel.bind(this), { passive: false });
		this.div.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.div.addEventListener("mouseleave", this.onMouseLeave.bind(this));
	}

	onMouseDown(e) {
		this.cursorX = + e.clientX;
		this.cursorY = + e.clientY;
		this.addedMouseMove = this.onMouseMove.bind(this);
		this.addedMouseUp = this.onMouseUp.bind(this);
		this.div.addEventListener("mouseup", this.addedMouseUp);
		this.div.addEventListener("mousemove", this.addedMouseMove);
	}

	onMouseMove(e) {
		let dX = e.clientX - this.cursorX;
		let dY = e.clientY - this.cursorY;
		this.cursorX = e.clientX;
		this.cursorY = e.clientY;

		this.pan(dX, dY);
	}

	onMouseUp(e) {
		this.onMouseLeave(e);
	}

	onMouseLeave(e) {
		if(this.addedMouseMove) {
			this.div.removeEventListener("mousemove", this.addedMouseMove);
			this.div.removeEventListener("mouseup", this.addedMouseUp);
			this.addedMouseMove = null;
			this.addedMouseUp = null;
		}
	}

	onWheel(e) {
		e.preventDefault();
		
		//console.log("Wheel: "+e.deltaY);
		this.zoom(e.deltaY, e.clientX, e.clientY);
	}
}