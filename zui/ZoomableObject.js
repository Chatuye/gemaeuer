import { ZoomableElementSO, ZoomableElement } from './ZoomableElement.js';
import { svgLoader } from '../assets/SVGLoader.js';



export class ZoomableObjectSO extends ZoomableElementSO {
    constructor() {
        super();
        
        this.objectType = "ZOOMABLEOBJECT";
        
        this.svg01Key = "card";
    }
}

export class ZoomableObject extends ZoomableElement {
    constructor(stateObject) {
        let mySVG = svgLoader.clone(stateObject.svg01Key);
        stateObject.width = mySVG.getAttribute("width"); 
        stateObject.height = mySVG.getAttribute("height");

        super(stateObject);
        this.svg = mySVG;

        this.div.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
        this.div.appendChild(this.svg);
    }

    onDivObserved() {
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");

        super.onDivObserved();
    }
}
