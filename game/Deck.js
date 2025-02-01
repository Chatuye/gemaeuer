class DeckDO extends ZoomableObjectDO {
    constructor() {
        super();

        this.objectType = "DECK";
    }
}

class Deck extends ZoomableObject {
    constructor(dataObject) {
        dataObject.positionBehaviour = "FIXED";
        dataObject.positionType = "ABSOLUTE";
        dataObject.dimensionsBehaviour = "FIXED";
        dataObject.dimensionsType = "ABSOLUTE";
        dataObject.uiScaling = true;
        dataObject.svg01Key = "cardBack";
        dataObject.zIndex = 200000;

        super(dataObject);
    }

    onMouseUp(e) {
        if(!this.pickedUp) {
            let cardDO = new CardDO();
            cardDO.parent.referenceId = this.parent.dataObject.objectId;
            cardDO.x = this.dataObject.x;
            cardDO.y = this.dataObject.y;
            cardDO.facing = "FRONT";
            cardDO.zIndex = 0;

            cardDO.positionBehaviour = "FIXED";
            cardDO.positionType = "ABSOLUTE";
            cardDO.dimensionsBehaviour = cardDimensions.behaviour;
            cardDO.dimensionsType = cardDimensions.type;
            cardDO.uiScaling = cardDimensions.uiScaling;
            cardDO.svg01Key = "card";
            cardDO.svg02Key = "cardBack";

            let card = dataManager.createObject(cardDO);
            this.parent.registerChild(card);
            this.parent.hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}