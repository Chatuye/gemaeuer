class CardStage extends Stage {
	constructor(p) {
		super(p);

		this.hand = null;
		this.deck = new Deck(this);
		this.spot = new Spot(this);
		this.draggedCard = null
	}

	onDivObserved() {
		this.clientRect = this.div.getBoundingClientRect();
		this.hand = new Hand(this);
		super.onDivObserved();
	}

	onResize() {
		super.onResize();
		this.hand.onStageResize();
	}

	onMouseMove(e) {
		super.onMouseMove(e);
		//console.log("MouseX: "+this.cursorX)
		//console.log("MouseY: "+this.cursorY)
		this.updateHandMode();

		if(this.draggedCard) {
			if(this.spot.checkOverlap(this.draggedCard))
				this.spot.highlight(true);
			else
				this.spot.highlight(false);
		}
	}

	updateHandMode() {
		if(this.hand!=null) {
			if (this.cursorY > this.hand.interactionY) {
				this.hand.raise();
			} else if (this.cursorY < this.hand.interactionY) {
				this.hand.lower();
			}
		}
	}

	getTopZIndex() {
		return this.maxUsedZIndex+this.hand.cards.length+1;
	}
}