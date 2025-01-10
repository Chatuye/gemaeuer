class Spot extends StageObject {
	constructor(stage, x, y) {
		super(stage, "spot");

		this.coordinate.updateBaseValues(x, y);

		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
		this.div.style.transitionDuration = "200ms";
		this.div.style.transitionProperty ="filter";
	}

	calculateOverlap(stageObject) {
		let spotX1 = this.coordinate.stageX;
		let spotX2 = this.coordinate.stageX + this.dimensions.stageWidth;
		let spotY1 = this.coordinate.stageY;
		let spotY2 = this.coordinate.stageY + this.dimensions.stageHeight;
		let objectX1 = stageObject.coordinate.stageX;
		let objectX2 = stageObject.coordinate.stageX + stageObject.dimensions.stageWidth;
		let objectY1 = stageObject.coordinate.stageY;
		let objectY2 = stageObject.coordinate.stageY + stageObject.dimensions.stageHeight;
		
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