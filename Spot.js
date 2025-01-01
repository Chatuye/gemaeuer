class Spot {
	constructor(num) {
		this.div = null;
		this.clientRect = null;
		this.clientCenter = new Coordinate(0, 0);
		this.additionalInteractionPixels = 0;
		this.hidden = true;

		this.unit = null;

		this.div = document.createElement("div");
		this.div.className = "Spot";

		this.num = num

		this.div.addEventListener("click", this.onClick.bind(this));
	}

	onClick(e) {
		debugDiv.innerHTML = "Spot: " + this.num;
	}

	onObserve() {
		this.updateDimensions();
	}

	updateDimensions() {
		let myWidth = card.width;
		let myHeight = Math.round(card.height/2)

		this.div.style.height = myHeight + "px";
		this.div.style.width = myWidth + "px";
		
		let myLeft = 0;
		let myTop = 0;

		let stageCenterX = Math.round(stage.clientRect.width/2);
		let myMarginX = Math.round(0.05 * myWidth);
		let fromCenter = myMarginX*2;

		if(this.num%2==1) {
			myLeft = stageCenterX - fromCenter - myWidth;
		} else {
			myLeft = stageCenterX - fromCenter - (2*myWidth) - myMarginX;
		}
		let myMarginY = Math.round(0.2 * myHeight);
		let numRows = Math.ceil(spots.length/2);
		//let sumHeight = (numRows*mHeight) + ((myRows-1)*myMarginY);
		let myRow = Math.ceil((this.num+1)/2);
		myTop = (stage.clientRect.height - (card.height*1.4) - ((numRows-myRow)*(myHeight+myMarginY)) - myHeight*2);

		/* Position Einzeilig, Zentriert
		let stageCenterX = Math.round(stage.clientRect.width/2);
		let myMargin = Math.round(0.1 * myWidth);
		let sumWidth = (spots.length*myWidth) + ((spots.length-1)*myMargin);
		let firstLeft = stageCenterX-Math.round(sumWidth/2);
		myLeft = firstLeft + this.num*(myWidth+myMargin);
		myTop = (stage.clientRect.height - (card.height*1.5) - myHeight);
		*/
		this.div.style.left = myLeft + "px";
		this.div.style.top = myTop + "px";

		this.clientRect = this.div.getBoundingClientRect();
		this.clientCenter.x = this.clientRect.left + (Math.floor(this.clientRect.width / 2))
		this.clientCenter.y = this.clientRect.top + (Math.floor(this.clientRect.height / 2));

		if(this.unit)this.updateUnitCoords();
	}

	updateUnitCoords() {
		this.unit.div.style.left = this.div.style.left;
		this.unit.div.style.top = this.div.style.top;
	}

	getClientDistance(coord) {

		var a = Math.abs(coord.x - this.clientCenter.x);
		var b = Math.abs(coord.y - this.clientCenter.y);

		return Math.round(Math.sqrt(a * a + b * b));
	}

	checkOverlap(rect) {
		let overlap = false;
		let overlapX = true;
		let overlapY = true;

		let left = this.clientRect.left - this.additionalInteractionPixels;
		let right = this.clientRect.right + this.additionalInteractionPixels;
		let top = this.clientRect.top - this.additionalInteractionPixels;
		let bottom = this.clientRect.bottom + this.additionalInteractionPixels;

		if((left > rect.right)||(right < rect.left))
			overlapX = false;
		
		if((top > rect.bottom)||(bottom < rect.top))
			overlapY = false;

		if((overlapX == true) && (overlapY == true))
			overlap = true;
		
		return overlap;
	}

	highlight(condition) {
		if(!this.hidden) {
			if(condition) {
				//this.div.style.backgroundColor = "rgba(0, 0, 0, 0.66)";
				this.div.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
			} else {
				//this.div.style.backgroundColor = "rgba(0, 0, 0, 0.33)";
				this.div.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
			}
		} else {

		}
	}

	hide() {
		this.hidden = true;
		this.div.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
		//this.div.style.backgroundColor = "rgba(255, 255, 255, 0.0)";
	}

	show() {
		this.hidden = false;
		//this.div.style.backgroundColor = "rgba(0, 0, 0, 0.33)";
		this.div.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
	}
}