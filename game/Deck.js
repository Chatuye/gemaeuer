class Deck extends ZoomableObject {
    constructor(parent, x, y) {
        super(parent, "fixed", "absolute", x, y, "fixed", "absolute", true, "cardBack");
    }

    onMouseUp(e) {
        if(!this.pickedUp) {
            let card = new Card(stage, this.x, this.y, "front");
            this.parent.registerChild(card);
            this.parent.hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}