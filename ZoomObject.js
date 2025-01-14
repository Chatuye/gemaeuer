class ZoomObject extends ZoomDiv {
	constructor(zoomableDiv, imgSrcFront, imgSrcBack, face, x, y) {
		super(zoomableDiv, x, y);

		this.face = "front";

		this.div.style.perspective = "1000px";
		
		
		this.innerDiv = document.createElement("div");
		this.innerDiv.style.position = "relative";
		this.innerDiv.style.overflow = "visible";
		this.innerDiv.style.width = "100%";
		this.innerDiv.style.height = "100%";
		this.innerDiv.style.transitionProperty ="transform";
		this.innerDiv.style.transform = "none";
		this.innerDiv.style.transformStyle = "preserve-3d";
		

		this.wrapperFront = document.createElement("div");
		this.wrapperFront.style.position = "absolute";
		this.wrapperFront.style.width = "100%";
		this.wrapperFront.style.height = "100%";
		this.wrapperFront.style.setProperty("-webkit-backface-visibility", "hidden");
		

		this.wrapperBack = document.createElement("div");
		this.wrapperBack.style.position = "absolute";
		this.wrapperBack.style.width = "100%";
		this.wrapperBack.style.height = "100%";
		this.wrapperBack.style.backfaceVisibility = "hidden";
		this.wrapperBack.style.transform = "rotateY(180deg)";
		

		let mySVGParentFront = document.createElement("div");
		mySVGParentFront.innerHTML = svgData[imgSrcFront];
		this.stageObjectSVGFront = mySVGParentFront.firstElementChild;
		this.wrapperFront.appendChild(this.stageObjectSVGFront);
		
		let mySVGParentBack = document.createElement("div");
		mySVGParentBack.innerHTML = svgData[imgSrcBack];
		this.stageObjectSVGBack = mySVGParentBack.firstElementChild;
		this.wrapperBack.appendChild(this.stageObjectSVGBack);

		if(face == "back") this.flip(0);
		if(face == "back") this.stageObjectSVG = this.stageObjectSVGBack;
		else this.stageObjectSVG = this.stageObjectSVGFront;
	}

	flip(d) {
		if(this.face == "front") {
			this.innerDiv.style.transitionDuration = d+"ms";
			this.innerDiv.style.transform = "rotateY(180deg)";
			this.face = "back";
		} else {
			this.innerDiv.style.transitionDuration = d+"ms";
			this.innerDiv.style.transform = "none";
			this.face = "front";
		}
	}

	onDivAppended() {
		this.divObserver = new MutationObserver(this.onDivMutation.bind(this));
		this.divObserver.observe(this.div, { attributes: false, childList: true, characterData: false });
		this.div.appendChild(this.innerDiv);
	}

	onDivMutation(mutations) {
		mutations.forEach(this.onDivMutationHelper.bind(this))
	}

	onDivMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.innerDiv)) {
			this.parentObserver.disconnect();
			this.onSVGAppended();
		}
	}

	onSVGAppended() {
        this.onLoad();
	}
	
    onLoad() {
		this.innerDiv.appendChild(this.wrapperFront);
		this.innerDiv.appendChild(this.wrapperBack);

		this.width = this.stageObjectSVG.getAttribute("width");
        this.height = this.stageObjectSVG.getAttribute("height");
		super.onLoad();

		this.div.addEventListener("click", this.onClick.bind(this));
    }

	onClick() {
		this.flip(800);
	}

	onDimensionsChange() {
		this.stageObjectSVGFront.setAttribute("width", this.parent.viewPortScale*this.width);
		this.stageObjectSVGFront.setAttribute("height", this.parent.viewPortScale*this.height);
		this.stageObjectSVGBack.setAttribute("width", this.parent.viewPortScale*this.width);
		this.stageObjectSVGBack.setAttribute("height", this.parent.viewPortScale*this.height);
		super.onDimensionsChange();
	}
}