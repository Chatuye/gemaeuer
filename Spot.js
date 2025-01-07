class Spot extends StageObject {
	constructor(stage, x, y) {
		super(stage, "spot");

		this.stageCoordinate.updateBaseValues(x, y);

		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
		this.div.style.transitionDuration = "200ms";
		this.div.style.transitionProperty ="filter";
	}

	calculateOverlap(stageObject) {
		let spotX1 = this.stageCoordinate.stageX;
		let spotX2 = this.stageCoordinate.stageX + this.stageDimensions.stageWidth;
		let spotY1 = this.stageCoordinate.stageY;
		let spotY2 = this.stageCoordinate.stageY + this.stageDimensions.stageHeight;
		let objectX1 = stageObject.stageCoordinate.stageX;
		let objectX2 = stageObject.stageCoordinate.stageX + stageObject.stageDimensions.stageWidth;
		let objectY1 = stageObject.stageCoordinate.stageY;
		let objectY2 = stageObject.stageCoordinate.stageY + stageObject.stageDimensions.stageHeight;
		
		return Math.max(0, Math.min(spotX2, objectX2) - Math.max(spotX1, objectX1)) * Math.max(0, Math.min(spotY2, objectY2) - Math.max(spotY1, objectY1));
	}

	highlight(b) {
		let r = 8*this.stage.scale;
		if(b) 
			this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px "+r+"px #FFFFFF)");
		else
			this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
	}
}