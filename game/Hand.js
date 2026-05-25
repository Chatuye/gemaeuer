import { StateObject } from '../core/StateObject.js';
import { dataManager } from '../core/DataManager.js';
import { objectRegistry } from '../core/ObjectRegistry.js';
import { eventBus } from '../core/EventBus.js';
import { renderer } from '../rendering/Renderer.js';



export class HandState extends StateObject {
    constructor() {
        super();
        
        this.objectType = "HAND";

        this.stage = { referenceId: -1 };
        this.cardWidth = 0;
        this.cardHeight = 0;

		this.cards = new Array();
    }
}

export class Hand {
    constructor(state) {
		this.state = state;
        dataManager.registerObject(this);    

        this.stage = dataManager.getObject(this.state.stage.referenceId);
		this.cards = new Array();

        let d = this.calculateCoordinates();
        this.x = d.x;
        this.y = d.y;
		this.cardDimensions = this.getCardScreenDimensions();

        this.mode = "LOWERED";
		this.relCardOffsetLowered = 0.5;
		this.relCardOffsetRaised = 0.05;
		this.addRelCardOffsetRaisedPerCard = 0.02;

		this.interactionYLowered = 0;
		this.interactionYRaised = 0;
		this.interactionY = 0;
		this.calculateInteractionY();

        for(let i = 0; i < this.state.cards.length; i++) {
			this.cards.push(dataManager.hydrateObject(this.state.cards[i]));
		}		
		this.positionCards();

        // Event handlers filter by stage to prevent cross-stage interference
        // when multiple GameStages exist simultaneously.
        this.onCardDrawn = ({ card }) => {
            if (card.parent === this.stage) this.addCard(card);
        };
        this.onCardGrabbed = ({ card }) => {
            if (this.getCards().includes(card)) {
                this.removeCard(card);
            }
        };
        this.onCardDroppedInHand = ({ card }) => {
            if (card.parent === this.stage) this.addCard(card);
        };
        this.onCursorEnteredHandZone = ({ stage }) => {
            if (stage === this.stage) this.raise();
        };
        this.onCursorLeftHandZone = ({ stage }) => {
            if (stage === this.stage) this.lower();
        };
        this.onLayoutChanged = ({ stage }) => {
            if (stage === this.stage) this.onParentChange();
        };
        this.onCardDeleted = ({ card }) => {
            if (this.getCards().includes(card)) {
                this.removeCard(card);
                this.positionCards();
            }
        };

        eventBus.on('card:drawn', this.onCardDrawn);
        eventBus.on('card:grabbed', this.onCardGrabbed);
        eventBus.on('card:droppedInHand', this.onCardDroppedInHand);
        eventBus.on('cursor:enteredHandZone', this.onCursorEnteredHandZone);
        eventBus.on('cursor:leftHandZone', this.onCursorLeftHandZone);
        eventBus.on('layout:changed', this.onLayoutChanged);
        eventBus.on('card:deleted', this.onCardDeleted);
    }

	getCards() {
		return this.cards;
	}

    onParentChange() {
		let d = this.calculateCoordinates();
        this.x = d.x;
        this.y = d.y;

		this.cardDimensions = this.getCardScreenDimensions();
		this.calculateInteractionY();
		this.positionCards();
	}

	getCardScreenDimensions() {
		// SCREEN preset: FIXED + ABSOLUTE + scaleWithWindowSize
		let w = this.state.cardWidth;
		let h = this.state.cardHeight;
		let uiScale = this.stage.getUIScale(true);
		w *= uiScale.scaleX;
		h *= uiScale.scaleY;
		return { width: w, height: h };
	}

    calculateCoordinates() {
		let d = this.stage.getScreenDimensions();
        let x = d.width / 2;
        let y = d.height;
        return {x: x, y: y}
    }

	positionCards() {
		if(this.getCards().length > 0) {
			let l = this.getCards().length;
			
            if(this.getCards().includes(this.stage.pickedUpChild))
				l--;
			
            let middle = 0;
			if ((l % 2) == 1)
				middle = Math.floor(l / 2); 
			else
				middle = l / 2 - 0.5;

			for(var i=0; i<this.getCards().length; i++)
				this.positionCard(this.getCards()[i], i, middle);
		}	
	}
	positionCard(card, pos, middle) {
		let fromCenter = pos - middle;

		// Rotate card via Renderer
		let angle = fromCenter * 0.05;

		// Position card — use card's getScreenDimensions for reliable bounds
        let cD = card.getScreenDimensions();
		let anchorX = Math.round(cD.width / 2);
		let anchorY = cD.height;
		let newX = (this.x - anchorX) + (fromCenter * Math.floor(cD.width / 1.9));
		let newY = (this.y - anchorY) + Math.abs(0.8 * fromCenter * (Math.sin(angle) * (cD.width / 2)));

		switch(this.mode) {
			case "LOWERED":
				newY += this.cardDimensions.height*this.relCardOffsetLowered;
				break;
			case "RAISED":
				newY -= this.cardDimensions.height*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.getCards().length));
				break;
			default:
				console.log("ERROR: Unknown hand mode.");
		}

		renderer.setStateMulti(card.state.objectId, {
			transformOrigin: '50% 100%',
			rotation: angle,
			x: newX,
			y: newY
		});
	}

	addCard(card) {
		this.stage.zManager.remove(card);
		this.stage.zManager.set(card, 1);

		this.getCards().push(card);
		this.state.cards.push(card.state.objectId);
		
		this.positionCards();
	}
	removeCard(card) {
		let i = this.getCards().indexOf(card);
		this.getCards().splice(i, 1);

		i = this.state.cards.indexOf(card.state.objectId);
		this.state.cards.splice(i, 1);
	}

	calculateInteractionY() {
		let d = this.stage.getScreenDimensions();
		let pDHeight = d.height;
		let cardHeight = this.cardDimensions.height;

		this.interactionYLowered = pDHeight - (cardHeight*this.relCardOffsetLowered);
		this.interactionYRaised = pDHeight - cardHeight - (cardHeight*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.getCards().length)));
		if(this.mode == "LOWERED")
			this.interactionY = this.interactionYLowered;
		else if(this.mode == "RAISED") 
			this.interactionY = this.interactionYRaised;
		else 
			console.log("ERROR: Unknown hand mode.");
	}

	raise() {
		if (this.mode == "LOWERED") {
			this.mode = "RAISED";
			this.interactionY = this.interactionYRaised;
			this.positionCards();
		}
	}

	lower() {
		if (this.mode == "RAISED") {
			this.mode = "LOWERED";
			this.interactionY = this.interactionYLowered;
			this.positionCards();
		}
	}

	destroy() {
		eventBus.off('card:drawn', this.onCardDrawn);
		eventBus.off('card:grabbed', this.onCardGrabbed);
		eventBus.off('card:droppedInHand', this.onCardDroppedInHand);
		eventBus.off('cursor:enteredHandZone', this.onCursorEnteredHandZone);
		eventBus.off('cursor:leftHandZone', this.onCursorLeftHandZone);
		eventBus.off('layout:changed', this.onLayoutChanged);
		eventBus.off('card:deleted', this.onCardDeleted);
	}
}

objectRegistry.register("HAND", Hand);
