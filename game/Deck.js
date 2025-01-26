class Deck extends ZoomableElement {
    constructor(parent, x, y) {
        let mySVG = svgLoader.clone("cardBack");
        super(parent, "fixed", "absolute", x, y, "fixed", "absolute", mySVG.getAttribute("width"), mySVG.getAttribute("height"), true);
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
            let card = new Card(stage, this.x, this.y, "front");
            this.parent.registerChild(card);
            hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}