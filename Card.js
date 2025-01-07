class Card extends TangibleObject {
	constructor(stage, spawnStageCoordinate, hand) {
		super(stage, "card");

		this.hand = hand;
		
		this.stageCoordinate.updateBaseValues(spawnStageCoordinate.baseX, spawnStageCoordinate.baseY);
	}

	onLoad() {
		super.onLoad();
		if(!this.stage.hand.interactionYCalculated) {
			this.stage.hand.calculateInteractionY(this.stageDimensions.stageHeight);
		}

		this.stageObjectSVG.getElementById("title").firstChild.innerHTML = "Card no. "+(this.stage.stageObjects.length-2);
		if(this.hand) this.hand.addCard(this);
	}
	
	onMouseDown(e) {
		super.onMouseDown(e);

		this.stage.draggedCard = this;
		this.div.style.transform = "none";
	}

	onMouseUp(e) {
		super.onMouseUp(e);

		this.stage.draggedCard = null;

		if(this.stage.spot.checkOverlap(this)) {
			if(this.hand)this.hand.removeCard(this);
			this.stage.spot.highlight(false);
			this.stageCoordinate.updateScaledValues(this.stage.spot.stageCoordinate.stageX, this.stage.spot.stageCoordinate.stageY)
		} else if((!this.hand)&&(this.stage.hand.mode == "raised")) {
			this.stage.hand.addCard(this)
		} else if((this.hand)&&(this.stage.hand.mode == "lowered")) {
			this.hand.removeCard(this);
		}

		this.stage.hand.positionCards();
	}
}