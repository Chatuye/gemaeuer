class Spot extends StageObject {
	constructor(stage) {
		super(stage, "spot");

		this.stageCoordinate.updateBaseValues(400,400);

		this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
		this.div.style.transitionDuration = "200ms";
		this.div.style.transitionProperty ="filter";
	}

	checkCoordinate(x,y) {
		let check = false;
		if(y >= this.stageCoordinate.stageY)
			if(y < (this.stageCoordinate.stageY+this.stageDimensions.stageHeight))
				if(x >= this.stageCoordinate.stageX)
					if(x < (this.stageCoordinate.stageX+this.stageDimensions.stageWidth))
						check = true;
		
		return check;
	}

	checkOverlap(stageObject) {
		let x1 = stageObject.stageCoordinate.stageX;
		let x2 = stageObject.stageCoordinate.stageX + stageObject.stageDimensions.stageWidth;
		let y1 = stageObject.stageCoordinate.stageY;
		let y2 = stageObject.stageCoordinate.stageY + stageObject.stageDimensions.stageHeight;

		return ((this.checkCoordinate(x1, y1))
			|| (this.checkCoordinate(x2, y1))
			|| (this.checkCoordinate(x1, y2))
			|| (this.checkCoordinate(x2, y2)));
	}

	highlight(b) {
		let r = 8*this.stage.scale;
		if(b) 
			this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px "+r+"px #FFFFFF)");
		else
			this.div.style.setProperty("-webkit-filter", "drop-shadow(0px 0px 0px #000000)");
	}
}