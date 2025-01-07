class CardStage extends Stage {
	constructor(p) {
		super(p);

		this.hand = null;
		this.deck = new Deck(this);
		
		this.spots = new Array();
		this.spots[0] = new Spot(this, 500, 100);
		this.spots[1] = new Spot(this, 750, 100);
		this.spots[2] = new Spot(this, 500, 400);
		this.spots[3] = new Spot(this, 750, 400);
		
		this.draggedCard = null;
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
	}

	checkSpotOverlap() {

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