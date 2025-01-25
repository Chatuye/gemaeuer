class Deck extends ZoomableElement {
    constructor(parent, x, y) {
        let mySVG = svgLoader.clone("cardBack");
        super(parent, "fixed", "absolute", x, y, "fixed", "absolute", 100, 100, "keepAspectRatio", mySVG.getAttribute("width"), mySVG.getAttribute("height"));
        this.svg = mySVG;

        this.div.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
        this.div.appendChild(this.svg);
    }

    onDivObserved() {
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");

        super.onDivObserved();
    }

    onMouseUp(e) {
        if(!this.pickedUp) {
            let card = new Card(stage, 500, 500, "front");
            this.parent.registerChild(card);
            hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}