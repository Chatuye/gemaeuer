import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { ZoomableObjectSO, ZoomableObject } from '../zui/ZoomableObject.js';
import { CardSO } from './Card.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';



export class DeckSO extends ZoomableObjectSO {
    constructor() {
        super();

        this.objectType = "DECK";
    }
}

export class Deck extends ZoomableObject {
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
            eventBus.emit('card:drawn', { card });
        }

        super.onMouseUp(e);
    }
}

objectRegistry.register("DECK", Deck);
