class Hand {
	constructor(stage) {
		this.relCardOffsetLowered = 0.5;
		this.relCardOffsetRaised = 0.05;
		this.addRelCardOffsetRaisedPerCard = 0.02;

		this.stage = stage;
		this.coordinate = new StageCoordinate(stage, this.positionCards.bind(this))
		this.cards = new Array();
		//this.availableZIndexes = new Array();
		this.mode = "lowered";
		this.interactionYCalculated = false
		this.interactionY = 0;
		this.interactionYRaised = 0;
		this.interactionYLowered = 0;
	}
	
	onStageResize() {
		this.coordinate.updateStageValues(Math.round(this.stage.clientRect.width / 2), (this.stage.clientRect.height - 0));

		if(this.cards.length == 0) {
			this.calculateInteractionY(0);
		} else {
			this.calculateInteractionY(this.cards[0].dimensions.stageHeight)
		}
	}

	positionCards() {
		if(this.cards.length > 0) {
			let l = this.cards.length;
			if(this.stage.draggedCard)
				if(this.stage.draggedCard.hand==this) l--;
			let middle = 0;
			if ((l % 2) == 1)
				middle = Math.floor(l / 2); 
			else
				middle = l / 2 - 0.5;

			for(var i=0; i<this.cards.length; i++)
				if(this.stage.draggedCard != this.cards[i])
					this.positionCard(this.cards[i], i, middle);
		}	
	}

	positionCard(card, pos, middle) {
		let fromCenter = pos - middle;

		card.div.style.zIndex = this.stage.maxUsedZIndex+pos+1;

		//Rotate card
		card.div.style.transform = "none";
		let angle = fromCenter * 0.05;
		card.div.style.transformOrigin = "50% 100%";
		card.div.style.transform = "rotate(" + angle + "rad)";

		//Position card
		let anchorX = Math.round(card.dimensions.stageWidth / 2);
		let anchorY = card.dimensions.stageHeight;
		let newX = (this.coordinate.stageX - anchorX) + (fromCenter * Math.floor(card.dimensions.stageWidth / 1.9));
		let newY = (this.coordinate.stageY - anchorY) + Math.abs(0.8 * fromCenter * (Math.sin(angle) * (card.dimensions.stageWidth / 2)));

		switch (this.mode) {
			case "lowered":
				newY += Math.round(card.dimensions.stageHeight*this.relCardOffsetLowered);
				break;
			case "raised":
				newY -= Math.round(card.dimensions.stageHeight*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.cards.length)));
				break;
			default:
				console.log("Unknown hand mode.");
		}


		card.coordinate.updateStageValues(newX, newY);
	}

	addCard(card) {
		this.calculateInteractionY(card.dimensions.stageHeight);
		card.hand = this;
		this.cards.push(card);

		
		this.positionCards();
	}
	removeCard(card) {
		card.hand = null;
		var i = this.cards.indexOf(card);
		this.cards.splice(i, 1);
	}

	calculateInteractionY(height) {
		this.interactionYLowered = this.stage.clientRect.height - Math.round(height*this.relCardOffsetLowered);
		this.interactionYRaised = this.stage.clientRect.height - height - Math.round(height*(this.relCardOffsetRaised+(this.addRelCardOffsetRaisedPerCard*this.cards.length)))-4;
		if(this.mode == "lowered")
			this.interactionY = this.interactionYLowered;
		else if(this.mode == "raised") this.interactionY = this.interactionYRaised;
		else console.log("Error.");

		if(height > 0)this.interactionYCalculated = true; else this.interactionYCalculated = false;
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