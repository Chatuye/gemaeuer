class StageDiv {
	constructor(stage, parent) {
		this.state = "initializing";

		this.stage = stage;
		this.parent = parent;
		this.zIndex = 0;
		this.parent.registerChildDiv(this);

		this.div = document.createElement("div");
		this.div.style.position = "absolute";
		this.div.style.top = "0px";
		this.div.style.left = "0px";
		this.div.style.width = "0px";
		this.div.style.height = "0px";

		this.parentObserver = new MutationObserver(this.onParentMutation.bind(this));
		this.parentObserver.observe(this.parent.div, { attributes: false, childList: true, characterData: false });	
		this.parent.div.appendChild(this.div);

		this.assignCD();
	}

	assignCD() {
		this.coordinate = new StageCoordinate(this.stage, this.onCoordinateChange.bind(this));
		this.dimensions = new StageDimensions(this.stage, this.onDimensionsChange.bind(this));	
	}

	onParentMutation(mutations) {
		mutations.forEach(this.onParentMutationHelper.bind(this))
	}

	onParentMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.div)) {
			this.parentObserver.disconnect();
			this.onDivAppended();
		}
	}

	onDivAppended() {
        this.onLoad();
	}

    onLoad() {
		this.div.style.zIndex = this.zIndex;
		this.dimensions.updateBaseValues(this.dimensions.baseWidth, this.dimensions.baseHeight);
		this.coordinate.updateBaseValues(this.coordinate.baseX, this.coordinate.baseY);
		this.state = "onStage";
    }

	onCoordinateChange() {
		this.div.style.left =  this.coordinate.stageX + "px";
		this.div.style.top = this.coordinate.stageY + "px";
	}

	onDimensionsChange() {
		this.div.style.width = this.dimensions.stageWidth + "px";
		this.div.style.height = this.dimensions.stageHeight + "px";
	}

	onParentResize() {
		if(this.state == "onStage") {
			this.dimensions.onStageResize();
			this.coordinate.onStageResize();
		}
	}
}