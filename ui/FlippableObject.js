class FlippableObject extends ZoomableElement {
	constructor(parent, zLayer, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, uiScaling, svgKeyFront, svgKeyBack, facing) {
		let mySVGFront = svgLoader.clone(svgKeyFront);
		let mySVGBack = svgLoader.clone(svgKeyBack);

		super(parent, zLayer, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, mySVGFront.getAttribute("width"), mySVGFront.getAttribute("height"), uiScaling);
		
		this.svgFront = mySVGFront;
		this.svgBack = mySVGBack;

		this.facing = "front";

        this.div.className = "Flippable";
		this.wrapper = document.createElement("div");
        this.wrapper.className = "Wrapper";
		this.wrapperFront = document.createElement("div");
        this.wrapperFront.className = "Front";
		this.wrapperBack = document.createElement("div");
        this.wrapperBack.className = "Back";

		this.wrapperFront.appendChild(this.svgFront);
		this.wrapperBack.appendChild(this.svgBack);

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

        this.svgFront.setAttribute("width", "100%");
        this.svgFront.setAttribute("height", "100%");
        this.svgBack.setAttribute("width", "100%");
        this.svgBack.setAttribute("height", "100%");
    }
	onMouseUp(e) {
		if(!this.pickedUp)
			this.flip(800);

		super.onMouseUp(e);
	}
}