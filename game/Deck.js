import { LayoutPresets } from '../zui/config/LayoutPresets.js';
import { ZoomableObjectState, ZoomableObject } from '../zui/ZoomableObject.js';
import { CardState } from './Card.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';



export class DeckState extends ZoomableObjectState {
    constructor() {
        super();

        this.objectType = "DECK";
    }
}

export class Deck extends ZoomableObject {
    constructor(state) {
        super(state);
    }

    onMouseUp(e) {
        if(!this.isGrabbed) {
            let cardState = new CardState();
            cardState.parent.referenceId = this.parent.state.objectId;
            Object.assign(cardState, LayoutPresets.SCREEN);
            cardState.x = this.state.x;
            cardState.y = this.state.y;
            cardState.facing = "FRONT";
            cardState.svg01Key = "card";
            cardState.svg02Key = "cardBack";

            let card = dataManager.createObject(cardState);
            this.parent.registerChild(card);
            eventBus.emit('card:drawn', { card });
        }

        super.onMouseUp(e);
    }
}

objectRegistry.register("DECK", Deck);
