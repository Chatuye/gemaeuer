import { ZoomableElementState, ZoomableElement } from './ZoomableElement.js';
import { svgLoader } from '../assets/SVGLoader.js';



export class ZoomableObjectState extends ZoomableElementState {
    constructor() {
        super();
        
        this.objectType = "ZOOMABLEOBJECT";
        
        this.svg01Key = "card";
    }
}

export class ZoomableObject extends ZoomableElement {
    constructor(state) {
        let mySVG = svgLoader.clone(state.svg01Key);
        state.width = mySVG.getAttribute("width"); 
        state.height = mySVG.getAttribute("height");

        super(state);
        this.svg = mySVG;

        this.div.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
        this.div.appendChild(this.svg);

        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
    }
}
