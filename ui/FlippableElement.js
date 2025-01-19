class FlippableElement extends ZoomableElement {
	constructor(parent, positionType, x, y, dimensionsType, w, h, frontSVG, backSVG, facing) {
        super(parent, positionType, x, y, dimensionsType, w, h);
    
		this.facing = "front";

        this.div.className = "Flippable";
		this.wrapper = document.createElement("div");
        this.wrapper.className = "Wrapper";
		this.wrapperFront = document.createElement("div");
        this.wrapperFront.className = "Front";
		this.wrapperBack = document.createElement("div");
        this.wrapperBack.className = "Back";

		let mySVGParentFront = document.createElement("div");
		mySVGParentFront.innerHTML = svgData[frontSVG];
		this.stageObjectSVGFront = mySVGParentFront.firstElementChild;
		this.wrapperFront.appendChild(this.stageObjectSVGFront);
        this.stageObjectSVGFront.getElementById("text").firstChild.innerHTML = Math.floor((Math.random()*9))+1;
		
		let mySVGParentBack = document.createElement("div");
		mySVGParentBack.innerHTML = svgData[backSVG];
		this.stageObjectSVGBack = mySVGParentBack.firstElementChild;
		this.wrapperBack.appendChild(this.stageObjectSVGBack);

		if(facing == "back") this.flip(0);
    }

	flip(d) {
		if(this.facing == "front") {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "rotateY(180deg)";
			this.facing = "back";
		} else {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "none";
			this.facing = "front";
		}
	}

	onDivObserved() {
        super.onDivObserved();
		this.divObserver = new MutationObserver(this.onDivMutation.bind(this));
		this.divObserver.observe(this.div, { attributes: false, childList: true, characterData: false });
		this.div.appendChild(this.wrapper);
	}
	onDivMutation(mutations) {
		mutations.forEach(this.onDivMutationHelper.bind(this))
	}
	onDivMutationHelper(mutation) {
		if(Array.from(mutation.addedNodes).includes(this.wrapper)) {
			this.parentObserver.disconnect();
			this.onSVGObserved();
		}
	}
	onSVGObserved() {
		this.wrapper.appendChild(this.wrapperFront);
		this.wrapper.appendChild(this.wrapperBack);

		this.width = this.stageObjectSVGFront.getAttribute("width");
        this.height = this.stageObjectSVGFront.getAttribute("height");

        this.resizeDiv();

        this.stageObjectSVGFront.setAttribute("width", "100%");
        this.stageObjectSVGFront.setAttribute("height", "100%");
        this.stageObjectSVGBack.setAttribute("width", "100%");
        this.stageObjectSVGBack.setAttribute("height", "100%");

        this.div.addEventListener("click", this.onClick.bind(this));
    }

	onClick() {
		this.flip(800);
	}
}