class ZoomableObjectDO extends ZoomableElementDO {
    constructor() {
        super();
        
        this.objectType = "ZOOMABLEOBJECT";
        
        this.svg01Key = "card";
    }
}

class ZoomableObject extends ZoomableElement {
    constructor(dataObject) {
        let mySVG = svgLoader.clone(dataObject.svg01Key);
        dataObject.width = mySVG.getAttribute("width"); 
        dataObject.height = mySVG.getAttribute("height");

        super(dataObject);
        //super(parent, zLayer, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, mySVG.getAttribute("width"), mySVG.getAttribute("height"), uiScaling);
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
