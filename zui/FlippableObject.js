import { ZoomableElementState, ZoomableElement } from './ZoomableElement.js';
import { svgLoader } from '../assets/SVGLoader.js';



export class FlippableObjectState extends ZoomableElementState {
    constructor() {
        super();

        this.objectType = "FLIPPABLEOBJECT";
        
        this.svg01Key = "card";
        this.svg02Key = "cardBack";
		this.facing = "FRONT";
    }
}

export class FlippableObject extends ZoomableElement {
	constructor(state) {
		let mySVGFront = svgLoader.clone(state.svg01Key);
		let mySVGBack = svgLoader.clone(state.svg02Key);
        state.width = mySVGFront.getAttribute("width"); 
        state.height = mySVGFront.getAttribute("height");

		super(state);
		
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

		// Append wrapper structure directly (no MutationObserver needed — Renderer handles positioning)
		this.div.appendChild(this.wrapper);
		this.wrapper.appendChild(this.wrapperFront);
		this.wrapper.appendChild(this.wrapperBack);

		this.svgFront.setAttribute("width", "100%");
		this.svgFront.setAttribute("height", "100%");
		this.svgBack.setAttribute("width", "100%");
		this.svgBack.setAttribute("height", "100%");

		if(this.state.facing == "BACK") {
			this.state.facing = "FRONT";
			this.flip(0);
		}
    }

	flip(d) {
		if(this.state.facing == "FRONT") {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "rotateY(180deg)";
			this.state.facing = "BACK";
		} else {
			this.wrapper.style.transitionDuration = d+"ms";
			this.wrapper.style.transform = "none";
			this.state.facing = "FRONT";
		}
	}

	onMouseUp(e) {
		if(!this.pickedUp)
			this.flip(800);

		super.onMouseUp(e);
	}
}
