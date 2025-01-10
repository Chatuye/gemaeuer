class StageObject extends StageDiv {
	constructor(stage, imgSrc) {
		super(stage, stage);		
		let mySVGParent = document.createElement("div");
		mySVGParent.innerHTML = svgData[imgSrc];
		// svgData unsauber? daher den Knoten sauber extrahieren (firstElementChild) und dann an den div anhaengen.
		this.stageObjectSVG = mySVGParent.firstElementChild;
	}

	onDivAppended() {
		this.divObserver = new MutationObserver(this.onDivMutation.bind(this));
		this.divObserver.observe(this.div, { attributes: false, childList: true, characterData: false });
		this.div.appendChild(this.stageObjectSVG);
	}

	onDivMutation(mutations) {
		mutations.forEach(this.onDivMutationHelper.bind(this))
	}

	onDivMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.stageObjectSVG)) {
			this.parentObserver.disconnect();
			this.onSVGAppended();
		}
	}

	onSVGAppended() {
        this.onLoad();
	}

	
    onLoad() {
		this.dimensions.updateBaseValues(this.stageObjectSVG.getAttribute("width"), this.stageObjectSVG.getAttribute("height"));
		super.onLoad();
    }

	onDimensionsChange() {
		this.stageObjectSVG.setAttribute("width", this.dimensions.stageWidth);
		this.stageObjectSVG.setAttribute("height", this.dimensions.stageHeight);
		super.onDimensionsChange();
	}
}