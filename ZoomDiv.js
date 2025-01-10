class ZoomDiv extends StageDiv {
	constructor(zoomableDiv, x, y, w, h) {
		super(zoomableDiv.stage, zoomableDiv);

		this.x = x;
		this.y = y;
		this.width = w;
		this.height = h;

		this.div.style.position = "absolute";
		this.div.style.backgroundColor = "#00FF00";
	}

	assignCD() {
		// Overwrite with nothing.  c/d not required;
	}

    onLoad() {
		this.state = "onStage";
    }

	onCoordinateChange() {
		this.div.style.left = (this.parent.viewPortScale*(this.x - this.parent.viewPort.x1)) + "px";
		this.div.style.top = (this.parent.viewPortScale*(this.y - this.parent.viewPort.y1)) + "px";
	}

	onDimensionsChange() {
		this.div.style.width = (this.parent.viewPortScale*this.width) + "px";
		this.div.style.height = (this.parent.viewPortScale*this.height) + "px";
	}

	onReRender() {
		this.onCoordinateChange();
		this.onDimensionsChange();
	}
}