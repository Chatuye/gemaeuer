import { ZoomableElementState, ZoomableElement } from './ZoomableElement.js';
import { svgLoader } from '../assets/SVGLoader.js';
import { renderer } from '../rendering/Renderer.js';



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
		const targetTransform = this.state.facing === "FRONT"
			? "rotateY(180deg)"
			: "none";
		this.state.facing = this.state.facing === "FRONT" ? "BACK" : "FRONT";

		renderer.startTransition(this.state.objectId, this.wrapper, {
			duration: d,
			properties: { transform: targetTransform },
			onComplete: null
		});
	}

	onMouseUp(e) {
		if(!this.pickedUp)
			this.flip(800);

		super.onMouseUp(e);
	}
}
