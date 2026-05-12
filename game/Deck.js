class DeckSO extends ZoomableObjectSO {
    constructor() {
        super();

        this.objectType = "DECK";
    }
}

class Deck extends ZoomableObject {
    constructor(stateObject) {
        super(stateObject);
    }

    onMouseUp(e) {
        if(!this.pickedUp) {
            let cardSO = new CardSO();
            cardSO.parent.referenceId = this.parent.stateObject.objectId;
            Object.assign(cardSO, LayoutPresets.SCREEN);
            cardSO.x = this.stateObject.x;
            cardSO.y = this.stateObject.y;
            cardSO.facing = "FRONT";
            cardSO.svg01Key = "card";
            cardSO.svg02Key = "cardBack";

            let card = dataManager.createObject(cardSO);
            this.parent.registerChild(card);
            this.parent.hand.addCard(card);
        }

        super.onMouseUp(e);
    }
}
