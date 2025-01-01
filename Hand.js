class Hand {
	constructor() {
		this.cards = new Array();
		this.raised = false;
		this.cardAnchor = new Coordinate(0,0);
	}

	updateDimensions() {
		this.interactionHeightRaise = stage.clientRect.height - card.height;
		this.interactionHeightLower = stage.clientRect.height - Math.round(1.4*card.height);

		this.cardAnchor.x = Math.round(stage.clientRect.width / 2);
		this.cardAnchor.y = stage.clientRect.height;

		//console.log("1: "+this.cardAnchor.x);
	}

	addCard(card) {		
		if(card.handPos==-1) {
			card.handPos = this.cards.length;
		}

		this.cards.splice(card.handPos, 0, card);
		for (let i = 0; i < this.cards.length; i++) {
			this.cards[i].handPos = i;
			if(this.cards[i]==card) 
				this.cards[i].transitionAction = "add";
			else if(this.cards[i].transitionAction == "none")
				this.cards[i].transitionAction = "organize";
		}
		this.organizeCards();
	}

	removeCard(card) {
		this.cards.splice(card.handPos, 1);
		for (let i = 0; i < this.cards.length; i++) {
			this.cards[i].handPos = i;
		}

		for (let i = 0; i < this.cards.length; i++) {
			if(this.cards[i].transitionAction == "none")
				this.cards[i].transitionAction = "organize";
		}
		this.organizeCards();
	}

	raise() {
		if (!this.raised) {
			this.raised = true;

			for (let i = 0; i < this.cards.length; i++) {
				if(this.cards[i].transitionAction == "none")
					this.cards[i].transitionAction = "raise";
			}
			this.organizeCards();
		}
	}

	lower() {
		if (this.raised) {
			this.raised = false;
			
			for (let i = 0; i < this.cards.length; i++) {
				if(this.cards[i].transitionAction == "none")
					this.cards[i].transitionAction = "lower";
			}
			this.organizeCards();
		}
	}

	organizeCards() {
		if(this.cards.length>0) {
			let yOffset = 0;
			if (this.raised)
				yOffset = (-1)*Math.floor(this.cards[0].div.clientHeight / 3);
			else
				yOffset = Math.floor(this.cards[0].div.clientHeight / 2);

			for (let i = 0; i < this.cards.length; i++) {
				this.cards[i].div.style.zIndex=2+i;
				//alert(this.cards[i].div.style.zIndex);
				this.cards[i].moveToHand(new Coordinate(this.cardAnchor.x, this.cardAnchor.y+yOffset), i, this.cards.length);
			}
		}
	}
}