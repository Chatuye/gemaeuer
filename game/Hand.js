class HandDO extends DataObject {
    constructor() {
        super();
        
        this.objectType = "HAND";

        this.stage = { referenceId: -1 };

		this.cards = new Array();
    }
}

class Hand {
    constructor(dataObject) {
		this.dataObject = dataObject;
        dataManager.registerObject(this);    

        this.stage = dataManager.getObject(this.dataObject.stage.referenceId);
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

        for(let i = 0; i < this.dataObject.cards.length; i++) {
			this.cards.push(dataManager.getObject(this.dataObject.cards[i]));
		}		
		this.positionCards();
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
		let cD = this.stage.getScreenDimensionsOfChild(cardDimensions.behaviour, cardDimensions.type, cardDimensions.width, cardDimensions.height, cardDimensions.uiScaling);
		return cD;
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
			
            if(this.stage.pickedUpChild == this)
				if(this.stage.pickedUpChild.hand==this) l--;
			
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

		//Rotate card
		card.div.style.transform = "none";
		let angle = fromCenter * 0.05;
		card.div.style.transformOrigin = "50% 100%";
		card.div.style.transform = "rotate(" + angle + "rad)";

		//Position card
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


		card.moveTo(newX, newY);
	}

	addCard(card) {
		card.setHand(this);
		this.stage.zManager.remove(card);
		card.dataObject.zIndex = 1;
		this.stage.zManager.set(card);

		this.getCards().push(card);
		this.dataObject.cards.push(card.dataObject.objectId);
		
		this.positionCards();
	}
	removeCard(card) {
		card.setHand(null);

		let i = this.getCards().indexOf(card);
		this.getCards().splice(i, 1);

		i = this.dataObject.cards.indexOf(card.dataObject.objectId);
		this.dataObject.cards.splice(i, 1);
	}

	calculateInteractionY() {
		let pD = this.stage.getScreenDimensions();
		let cardHeight = this.cardDimensions.height;

		this.interactionYLowered = pD.height - (cardHeight*this.relCardOffsetLowered);
		this.interactionYRaised = pD.height - cardHeight - (cardHeight*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.getCards().length)));
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
}