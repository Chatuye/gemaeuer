class FlippableObjectDO extends ZoomableElementDO {
    constructor() {
        super();

        this.objectType = "FLIPPABLEOBJECT";
        
        this.svg01Key = "card";
        this.svg02Key = "cardBack";
		this.facing = "FRONT";
    }
}

class FlippableObject extends ZoomableElement {
	constructor(dataObject) {
		let mySVGFront = svgLoader.clone(dataObject.svg01Key);
		let mySVGBack = svgLoader.clone(dataObject.svg02Key);
        dataObject.width = mySVGFront.getAttribute("width"); 
        dataObject.height = mySVGFront.getAttribute("height");

		super(dataObject);
		
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
		
		if(this.dataObject.facing == "BACK") {
			this.dataObject.facing = "FRONT";
			this.flip(0);
		}
    }

	flip(d) {
		if(this.dataObject.facing == "FRONT") {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "rotateY(180deg)";
			this.dataObject.facing = "BACK";
		} else {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "none";
			this.dataObject.facing = "FRONT";
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