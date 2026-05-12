class FlippableObjectSO extends ZoomableElementSO {
    constructor() {
        super();

        this.objectType = "FLIPPABLEOBJECT";
        
        this.svg01Key = "card";
        this.svg02Key = "cardBack";
		this.facing = "FRONT";
    }
}

class FlippableObject extends ZoomableElement {
	constructor(stateObject) {
		let mySVGFront = svgLoader.clone(stateObject.svg01Key);
		let mySVGBack = svgLoader.clone(stateObject.svg02Key);
        stateObject.width = mySVGFront.getAttribute("width"); 
        stateObject.height = mySVGFront.getAttribute("height");

		super(stateObject);
		
		this.svgFront = mySVGFront;
		this.svgBack = mySVGBack;

        this.div.className = "Flippable";
		this.wrapper = document.createElement("div");
        this.wrapper.className = "Wrapper";
		this.wrapperFront = document.createElement("div");
        this.wrapperFront.className = "Front";
		this.wrapperBack = document.createElement("div");
        this.wrapperBack.className = "Back";

		this.wrapperFront.appendChild(this.svgFront);
		this.wrapperBack.appendChild(this.svgBack);
		
		if(this.stateObject.facing == "BACK") {
			this.stateObject.facing = "FRONT";
			this.flip(0);
		}
    }

	flip(d) {
		if(this.stateObject.facing == "FRONT") {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "rotateY(180deg)";
			this.stateObject.facing = "BACK";
		} else {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "none";
			this.stateObject.facing = "FRONT";
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
