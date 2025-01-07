class StageObject {
	constructor(stage, imgSrc) {
		this.state = "initializing";

		this.stage = stage;
		this.zIndex = 0;
		this.stage.registerStageObject(this);

		this.stageCoordinate = new StageCoordinate(this.stage, this.onCoordinateChange.bind(this));
		this.stageDimensions = new StageDimensions(this.stage, this.onDimensionsChange.bind(this));	
		
		let mySVGParent = document.createElement("div");
		mySVGParent.innerHTML = svgData[imgSrc];
		// svgData unsauber? daher den Knoten sauber extrahieren (firstElementChild) und dann an den div anhaengen.
		this.stageObjectSVG = mySVGParent.firstElementChild;

		this.div = document.createElement("div");
		this.div.style.position = "absolute";

		this.div.style.top = "0px";
		this.div.style.left = "0px";
		this.div.style.width = this.stageObjectSVG.getAttribute("width") + "px";
		this.div.style.height = this.stageObjectSVG.getAttribute("height") + "px";

		this.initObserver = new MutationObserver(this.onSVGObserved.bind(this));
		this.initObserver.observe(this.div, { attributes: false, childList: true, characterData: false });	
		
		this.div.appendChild(this.stageObjectSVG);
	}

	onSVGObserved(mutations) {
		mutations.forEach(this.onSVGObservedHelper.bind(this))
	}

	onSVGObservedHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.stageObjectSVG)) {
			this.initObserver.disconnect();
			this.initObserver = new MutationObserver(this.onDivObserved.bind(this));
			this.initObserver.observe(this.stage.div, { attributes: false, childList: true, characterData: false });	
			this.stage.div.appendChild(this.div);
		}
	}

	onDivObserved(mutations) {
		mutations.forEach(this.onDivObservedHelper.bind(this))
	}

	onDivObservedHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.div)) {
			this.initObserver.disconnect();
			this.onLoad();
		}
	}

	onLoad() {
		this.div.style.zIndex = this.zIndex;
		this.stageDimensions.updateBaseValues(this.stageObjectSVG.getAttribute("width"), this.stageObjectSVG.getAttribute("height"));
		this.stageCoordinate.updateBaseValues(this.stageCoordinate.baseX, this.stageCoordinate.baseY);
		this.state = "onStage";
	}

	onCoordinateChange() {
		this.div.style.left =  this.stageCoordinate.stageX + "px";
		this.div.style.top = this.stageCoordinate.stageY + "px";
	}

	onDimensionsChange() {
		this.stageObjectSVG.setAttribute("width", this.stageDimensions.stageWidth);
		this.stageObjectSVG.setAttribute("height", this.stageDimensions.stageHeight);
		this.div.style.width = this.stageDimensions.stageWidth + "px";
		this.div.style.height = this.stageDimensions.stageHeight + "px";
	}

	onStageResize() {
		if(this.state == "onStage") {
			this.stageDimensions.onStageResize();
			this.stageCoordinate.onStageResize();
		}
	}
}