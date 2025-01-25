class Hand {
    constructor(stage) {
        this.stage = stage;

        let d = this.calculateCoordinates();
        this.x = d.x;
        this.y = d.y;
		this.cardDimensions = this.getCardScreenDimensions();

        //console.log(this.x+" "+this.y);
        
        this.cards = new Array();
        this.mode = "lowered";
		this.relCardOffsetLowered = 0.5;
		this.relCardOffsetRaised = 0.05;
		this.addRelCardOffsetRaisedPerCard = 0.02;

		this.interactionYLowered = 0;
		this.interactionYRaised = 0;
		this.interactionY = 0;
		this.calculateInteractionY();
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
		let cD = this.stage.getScreenDimensionsOfChild(cardDimensions.behaviour, cardDimensions.type, cardDimensions.svgWidth, cardDimensions.svgHeight, "keepAspectRatio");
		return cD;
	}

    calculateCoordinates() {
		let d = this.stage.getScreenDimensions();
        let x = d.width / 2;
        let y = d.height;
        return {x: x, y: y}
    }

	positionCards() {
		if(this.cards.length > 0) {
			let l = this.cards.length;
			
            if(this.stage.pickedUpChild == this)
				if(this.stage.pickedUpChild.hand==this) l--;
			
            let middle = 0;
			if ((l % 2) == 1)
				middle = Math.floor(l / 2); 
			else
				middle = l / 2 - 0.5;

			for(var i=0; i<this.cards.length; i++)
				//if(this.stage.draggedCard != this.cards[i])
					this.positionCard(this.cards[i], i, middle);
		}	
	}
	positionCard(card, pos, middle) {
		let fromCenter = pos - middle;

		//card.div.style.zIndex = this.stage.maxUsedZIndex+pos+1;

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

		switch (this.mode) {
			case "lowered":
				newY += this.cardDimensions.height*this.relCardOffsetLowered;
				break;
			case "raised":
				newY -= this.cardDimensions.height*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.cards.length));
				break;
			default:
				console.log("Unknown hand mode.");
		}


		card.moveTo(newX, newY);
	}

	addCard(card) {
		card.hand = this;

		this.cards.push(card);
		
		this.positionCards();
	}
	removeCard(card) {
		card.hand = null;
		var i = this.cards.indexOf(card);
		this.cards.splice(i, 1);
	}

	calculateInteractionY() {
		let pD = this.stage.getScreenDimensions();
		let cardHeight = this.cardDimensions.height;

		this.interactionYLowered = pD.height - (cardHeight*this.relCardOffsetLowered);
		this.interactionYRaised = pD.height - cardHeight - (cardHeight*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.cards.length)));
		if(this.mode == "lowered")
			this.interactionY = this.interactionYLowered;
		else if(this.mode == "raised") 
			this.interactionY = this.interactionYRaised;
		else 
			console.log("Unknown hand mode.");
	}

	raise() {
		if (this.mode == "lowered") {
			this.mode = "raised";
			this.interactionY = this.interactionYRaised;
			this.positionCards();
		}
	}

	lower() {
		if (this.mode == "raised") {
			this.mode = "lowered";
			this.interactionY = this.interactionYLowered;
			this.positionCards();
		}
	}
}