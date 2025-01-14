class Tile extends ZoomObject {
	constructor(zoomableDiv, frontFace, backFace, x, y) {
		super(stage, "card");

		this.hand = hand;
		this.overlappingSpot = null;
		
		this.coordinate.updateBaseValues(spawnStageCoordinate.baseX, spawnStageCoordinate.baseY);
	}

	onLoad() {
		super.onLoad();
		if(!this.stage.hand.interactionYCalculated) {
			this.stage.hand.calculateInteractionY(this.dimensions.stageHeight);
		}

		this.stageObjectSVG.getElementById("title").firstChild.innerHTML = "Card no. "+(this.stage.childDivs.length);
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

		if(this.overlappingSpot) {
			if(this.hand) this.hand.removeCard(this);
			this.overlappingSpot.highlight(false);
			this.coordinate.updateStageValues(this.overlappingSpot.coordinate.stageX, this.overlappingSpot.coordinate.stageY)
		} else if((!this.hand)&&(this.stage.hand.mode == "raised")) {
			this.stage.hand.addCard(this)
		} else if((this.hand)&&(this.stage.hand.mode == "lowered")) {
			this.hand.removeCard(this);
		}

		this.stage.hand.positionCards();
	}

	checkSpots() {
		this.overlappingSpot = null;
		let maxOverlap = 0;
		for(let i = 0; i < this.stage.spots.length; i++) {
			let overlap = this.stage.spots[i].calculateOverlap(this);
			if(overlap > maxOverlap) {
				this.overlappingSpot = this.stage.spots[i];
				maxOverlap = overlap;
			}
		}
	}

	onCoordinateChange() {
		super.onCoordinateChange();
		
		this.checkSpots();
		
		var _this = this;	
		this.stage.spots.forEach(function(spot) {
			if((_this == _this.stage.draggedCard) && (spot == _this.overlappingSpot))
				spot.highlight(true);
			else
				spot.highlight(false)
		});
	}
}