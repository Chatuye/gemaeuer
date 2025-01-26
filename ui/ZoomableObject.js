class ZoomableObject extends ZoomableElement {
    constructor(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, uiScaling, svgKey) {
        let mySVG = svgLoader.clone(svgKey);
        super(parent, positioningBehaviour, positionType, x, y, dimensionsBehaviour, dimensionsType, mySVG.getAttribute("width"), mySVG.getAttribute("height"), uiScaling);
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
