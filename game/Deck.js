class DeckDO extends ZoomableObjectDO {
    constructor() {
        super();
    }
}

class Deck extends ZoomableObject {
    constructor(parent, dataObject) {
        dataObject.positionBehaviour = "FIXED";
        dataObject.positionType = "ABSOLUTE";
        dataObject.dimensionsBehaviour = "FIXED";
        dataObject.dimensionsType = "ABSOLUTE";
        dataObject.uiScaling = true;
        dataObject.svg01Key = "cardBack";
        dataObject.zLayer = 2;

        super(parent, dataObject);
    }

    onMouseUp(e) {
        if(!this.pickedUp) {
            let cardDO = new CardDO();
            cardDO.x = this.dataObject.x;
            cardDO.y = this.dataObject.y;
            cardDO.facing = "FRONT";

            let card = new Card(stage, cardDO);
            this.parent.registerChild(card);
            this.parent.hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}